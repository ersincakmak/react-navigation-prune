import { warn } from './dev.js';
import { createRouteKey, pruneState } from './pruneState.js';
import type {
  NavigationLike,
  NavigationStateLike,
  PruneOptions,
  PruneStateOptions,
  ResetActionLike,
  RouteLike,
  RouteToAdd,
} from './types.js';

/** Builds the RESET action by hand: same shape in v5 → v8, no imports needed. */
export function resetAction(state: NavigationStateLike): ResetActionLike {
  return { type: 'RESET', payload: state };
}

function readState(navigation: NavigationLike): NavigationStateLike | undefined {
  if (typeof navigation.getState === 'function') return navigation.getState();
  if (typeof navigation.dangerouslyGetState === 'function') return navigation.dangerouslyGetState();
  return undefined;
}

/** Resolves the navigator to operate on (supports v5 and v6+ parent APIs). */
export function resolveNavigation(
  navigation: NavigationLike,
  navigatorId?: string
): NavigationLike | undefined {
  if (navigatorId === undefined) return navigation;
  // `getId` exists only in v6+. v5's `getParent()` ignores its argument and
  // would silently return the direct parent, so it must not be used here.
  if (typeof navigation.getId !== 'function') {
    warn('`navigatorId` requires React Navigation v6+. Using the current navigator.');
    return navigation;
  }
  if (navigation.getId() === navigatorId) return navigation;
  if (typeof navigation.getParent === 'function') {
    try {
      const parent = navigation.getParent(navigatorId);
      if (parent) return parent;
    } catch {
      // v7+ may throw when the id is unknown; fall through to the warning
    }
  }
  warn(`No navigator with id "${navigatorId}" found among parents.`);
  return undefined;
}

function toStateOptions(options: PruneOptions, anchorKey?: string): PruneStateOptions {
  const { navigatorId: _ignored, ...rest } = options;
  return anchorKey === undefined ? rest : { ...rest, anchorKey };
}

/**
 * Removes the screens between the flow start (`from`) and the focused screen
 * of the navigator in a single RESET. Returns `true` if something was removed.
 * No dispatch (and no re-render) happens when there is nothing to remove.
 */
export function pruneStack(
  navigation: NavigationLike,
  options: PruneOptions & { anchorKey?: string }
): boolean {
  const target = resolveNavigation(navigation, options.navigatorId);
  if (!target) return false;
  const stateOptions = toStateOptions(options, options.anchorKey);

  const current = readState(target);
  if (current) {
    const next = pruneState(current, stateOptions);
    if (next === current) return false;
  }
  // Recompute inside the thunk on the freshest state (avoids races with
  // actions dispatched in the same tick).
  target.dispatch((state: NavigationStateLike) => resetAction(pruneState(state, stateOptions)));
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
  const target = resolveNavigation(navigation, options.navigatorId);
  if (!target) return;
  const newRoute: RouteLike = { key: route.key ?? createRouteKey(route.name), name: route.name };
  if (route.params !== undefined) newRoute.params = route.params;
  const stateOptions = toStateOptions(options);

  target.dispatch((state: NavigationStateLike) => {
    if (state.routeNames && state.routeNames.indexOf(route.name) === -1) {
      warn(`Screen "${route.name}" is not part of the target navigator.`);
    }
    return resetAction(navigateAndPruneState(state, newRoute, stateOptions));
  });
}
