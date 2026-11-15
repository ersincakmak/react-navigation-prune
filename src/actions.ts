import { warn } from './dev.js';
import { createRouteKey, findStartIndex, pruneState } from './pruneState.js';
import type {
  NavigationLike,
  NavigationStateLike,
  PruneOptions,
  PruneStateOptions,
  ResetActionLike,
  RouteLike,
  RouteToAdd,
} from './types.js';

/** Builds the RESET action by hand: same shape in v5 → v7, no imports needed. */
export function resetAction(state: NavigationStateLike): ResetActionLike {
  return { type: 'RESET', payload: state };
}

function readState(navigation: NavigationLike): NavigationStateLike | undefined {
  if (typeof navigation.getState === 'function') return navigation.getState();
  if (typeof navigation.dangerouslyGetState === 'function') return navigation.dangerouslyGetState();
  return undefined;
}

function parentOf(navigation: NavigationLike): NavigationLike | undefined {
  try {
    if (typeof navigation.getParent === 'function') return navigation.getParent() ?? undefined;
    if (typeof navigation.dangerouslyGetParent === 'function') {
      return navigation.dangerouslyGetParent() ?? undefined;
    }
  } catch {
    // some versions throw instead of returning undefined at the root
  }
  return undefined;
}

/** `navigatorId` works only where navigators have ids (v6, v7). */
function supportsIds(navigation: NavigationLike): boolean {
  return typeof navigation.getId === 'function';
}

/**
 * Resolves the navigator for an explicit `navigatorId` (v6/v7). On versions
 * without navigator ids (v5) it warns and returns the current navigation;
 * the target is then detected automatically from `from`.
 */
export function resolveNavigation(
  navigation: NavigationLike,
  navigatorId?: string
): NavigationLike | undefined {
  if (navigatorId === undefined) return navigation;
  // v5's `getParent()` ignores its argument, so
  // only trust `getParent(id)` when `getId` exists (v6/v7).
  if (!supportsIds(navigation)) {
    warn(
      '`navigatorId` requires React Navigation v6+. ' +
        'The target navigator is detected automatically from `from` instead.'
    );
    return navigation;
  }
  if (navigation.getId!() === navigatorId) return navigation;
  if (typeof navigation.getParent === 'function') {
    try {
      const parent = navigation.getParent(navigatorId);
      if (parent) return parent;
    } catch {
      // v7 throws when the id is unknown; fall through to the warning
    }
  }
  warn(`No navigator with id "${navigatorId}" found among parents.`);
  return undefined;
}

function toStateOptions(
  options: PruneOptions & { anchorKey?: string },
  anchorKey?: string
): PruneStateOptions {
  // `anchorKey` is always taken from the argument: after walking up to a
  // parent navigator the caller's (child) anchor no longer applies.
  const { navigatorId: _id, anchorKey: _anchor, ...rest } = options;
  return anchorKey === undefined ? rest : { ...rest, anchorKey };
}

function anchorIndex(state: NavigationStateLike, anchorKey: string | undefined): number {
  if (anchorKey === undefined) return state.index;
  for (let i = state.routes.length - 1; i >= 0; i--) if (state.routes[i]!.key === anchorKey) return i;
  return -1;
}

/**
 * Walks from `navigation` up through its parents and returns the first
 * navigator whose stack contains the flow start below its anchor. This makes
 * nested navigators work with zero configuration in every version.
 * O(depth × routes); the depth is tiny in practice.
 */
function findTarget(
  navigation: NavigationLike,
  options: PruneOptions & { anchorKey?: string },
  walk: boolean
): { target: NavigationLike; state: NavigationStateLike | undefined; anchorKey: string | undefined } | undefined {
  let nav: NavigationLike | undefined = navigation;
  let anchorKey = options.anchorKey;
  while (nav) {
    const state = readState(nav);
    if (!state) return { target: nav, state, anchorKey };
    const end = anchorIndex(state, anchorKey);
    if (end > 0 && findStartIndex(state, options, end) >= 0) return { target: nav, state, anchorKey };
    if (!walk) return { target: nav, state, anchorKey };
    nav = parentOf(nav);
    anchorKey = undefined; // a child's anchor key means nothing in the parent
  }
  return undefined;
}

/**
 * Removes the screens between the flow start (`from`) and the focused screen
 * in a single RESET. Returns `true` if something was removed. No dispatch (and
 * no re-render) happens when there is nothing to remove.
 *
 * If `from` is not in the current navigator, the parents are searched and the
 * first navigator containing it is pruned (unless `navigatorId` pins one).
 */
export function pruneStack(
  navigation: NavigationLike,
  options: PruneOptions & { anchorKey?: string }
): boolean {
  const explicit = options.navigatorId !== undefined && supportsIds(navigation);
  const start = resolveNavigation(navigation, options.navigatorId);
  if (!start) return false;
  const found = findTarget(start, options, !explicit);
  if (!found) {
    warn('Could not find the `from` screen in the current or any parent navigator.');
    return false;
  }
  const { target, state, anchorKey } = found;
  const stateOptions = toStateOptions(options, anchorKey);

  if (state) {
    const next = pruneState(state, stateOptions);
    if (next === state) return false;
  }
  // Recompute inside the thunk on the freshest state (avoids races with
  // actions dispatched in the same tick).
  target.dispatch((fresh: NavigationStateLike) => resetAction(pruneState(fresh, stateOptions)));
  return true;
}

/**
 * Pure: pushes `route` on top of the focused route, then removes everything
 * between the flow start and the new route.
 */
export function navigateAndPruneState<S extends NavigationStateLike>(
  state: S,
  route: RouteLike,
  options: PruneStateOptions
): S {
  const base = state.routes.slice(0, state.index + 1);
  base.push(route);
  const pushed = { ...state, routes: base, index: base.length - 1 };
  return pruneState(pushed, { ...options, anchorKey: route.key });
}

/**
 * Navigates to `route` and removes the intermediate screens in ONE state
 * update — the new screen animates in as a normal push and nothing flickers.
 * `route.name` must belong to the target navigator.
 */
export function navigateAndPrune(
  navigation: NavigationLike,
  route: RouteToAdd,
  options: PruneOptions
): void {
  const explicit = options.navigatorId !== undefined && supportsIds(navigation);
  let target = resolveNavigation(navigation, options.navigatorId);
  if (!target) return;
  if (!explicit) {
    // Push into the nearest navigator that declares the screen (like `navigate` does).
    for (let nav: NavigationLike | undefined = target; nav; nav = parentOf(nav)) {
      const names = readState(nav)?.routeNames;
      if (!names || names.indexOf(route.name) !== -1) {
        target = nav;
        break;
      }
    }
  }
  const newRoute: RouteLike = { key: route.key ?? createRouteKey(route.name), name: route.name };
  if (route.params !== undefined) newRoute.params = route.params;
  const stateOptions = toStateOptions(options);

  target!.dispatch((state: NavigationStateLike) => {
    if (state.routeNames && state.routeNames.indexOf(route.name) === -1) {
      warn(`Screen "${route.name}" is not part of the target navigator.`);
    }
    return resetAction(navigateAndPruneState(state, newRoute, stateOptions));
  });
}
