import { matches } from './matchers.js';
import type { NavigationStateLike, PruneStateOptions, RouteMatcher } from './types.js';

/**
 * Finds the index of the flow start inside `[0, end)`.
 * Single pass, stops at the first hit. Returns -1 when not found.
 */
export function findStartIndex(
  state: NavigationStateLike,
  options: { after?: RouteMatcher; from?: RouteMatcher; match?: 'nearest' | 'farthest' },
  end: number
): number {
  const { routes } = state;
  const from = options.after ?? options.from;
  if (from === undefined) return -1;
  if (options.match === 'farthest') {
    for (let i = 0; i < end; i++) if (matches(from, routes[i]!, i)) return i;
  } else {
    for (let i = end - 1; i >= 0; i--) if (matches(from, routes[i]!, i)) return i;
  }
  return -1;
}

/**
 * Pure function: returns a new state with the routes between the flow start
 * (`after` / `from`) and the anchor removed. Route objects (and therefore keys) are
 * reused, so remaining screens never remount.
 *
 * Returns the **same reference** when nothing would change; callers can use
 * `next === state` to skip dispatching.
 */
export function pruneState<S extends NavigationStateLike>(state: S, options: PruneStateOptions): S {
  const { routes } = state;
  const len = routes.length;
  if (len < 2) return state;

  let end = state.index;
  if (options.anchorKey !== undefined) {
    end = -1;
    for (let i = len - 1; i >= 0; i--) {
      if (routes[i]!.key === options.anchorKey) {
        end = i;
        break;
      }
    }
    if (end < 0) return state;
  }
  if (end <= 0) return state;

  const start = findStartIndex(state, options, end);
  if (start < 0) return state;

  const removeFrom = options.after === undefined ? start : start + 1;
  if (removeFrom >= end) return state;

  const keep = options.keep;
  const next = routes.slice(0, removeFrom);
  if (keep !== undefined) {
    for (let i = removeFrom; i < end; i++) {
      if (matches(keep, routes[i]!, i)) next.push(routes[i]!);
    }
  }
  if (next.length === end) return state; // everything in range was kept
  for (let i = end; i < len; i++) next.push(routes[i]!);

  // Re-locate the focused route; it may sit above the anchor.
  const focusedKey = routes[state.index]?.key;
  let index = next.length - 1;
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i]!.key === focusedKey) {
      index = i;
      break;
    }
  }

  return { ...state, routes: next, index };
}

let counter = 0;
/** Collision-safe key in the same `${name}-${id}` shape React Navigation uses. */
export function createRouteKey(name: string): string {
  counter = (counter + 1) % 1679616; // 36^4
  return `${name}-${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
