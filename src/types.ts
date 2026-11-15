/**
 * Minimal structural types. We intentionally do NOT import anything from
 * `@react-navigation/*` so the package works with v5, v6 and v7 and has
 * zero runtime (and zero type) dependencies.
 */

export interface RouteLike {
  key: string;
  name: string;
  params?: object | undefined;
  [extra: string]: unknown;
}

export interface NavigationStateLike {
  key?: string;
  index: number;
  routes: RouteLike[];
  routeNames?: string[];
  type?: string;
  stale?: boolean;
  [extra: string]: unknown;
}

export interface ResetActionLike {
  type: 'RESET';
  payload: NavigationStateLike;
}

type Thunk = (state: any) => any;

/**
 * The subset of the `navigation` object we rely on. Every member except
 * `dispatch` is optional so older/newer versions can be duck-typed.
 */
export interface NavigationLike {
  dispatch(action: any): void;
  /** v6+ */
  getState?: () => any;
  /** v5 */
  dangerouslyGetState?: () => any;
  /** v6+ */
  getId?: () => string | undefined;
  /** v6+ (`id` argument), v5 has no ids */
  getParent?: (id?: string) => any;
  /** v5 */
  dangerouslyGetParent?: () => any;
  addListener?: (type: any, callback: (e: any) => void) => () => void;
}

export type { Thunk };

export type RouteMatcher =
  | string
  | readonly string[]
  | ((route: RouteLike, index: number) => boolean);

/**
 * Where the flow starts. Pass exactly one:
 * - `after`: keep this screen, remove everything between it and the anchor.
 * - `from`: remove this screen too.
 */
export type PruneStart =
  | { after: RouteMatcher; from?: undefined }
  | { from: RouteMatcher; after?: undefined };

export interface PruneCommonOptions {
  /**
   * Which occurrence of the start screen to use if it appears more than once.
   * - `'nearest'` (default): the one closest to the anchor (top of the stack)
   * - `'farthest'`: the one closest to the bottom of the stack
   */
  match?: 'nearest' | 'farthest';
  /** Screens inside the removed range that must be kept anyway. */
  keep?: RouteMatcher;
}

export type PruneOptions = PruneStart &
  PruneCommonOptions & {
    /**
     * Pin a navigator by its `id` prop (v6/v7).
     * Usually unnecessary: without it, the current navigator is used, and if it
     * does not contain the start screen, its parents are searched automatically.
     */
    navigatorId?: string;
    /**
     * Key of the route that acts as the upper bound (it is always kept).
     * Defaults to the focused route.
     */
    anchorKey?: string;
  };

export type PruneStateOptions = PruneStart &
  PruneCommonOptions & {
    /**
     * Key of the route that acts as the upper bound (it is always kept).
     * Defaults to the focused route (`state.routes[state.index]`).
     */
    anchorKey?: string;
  };

export interface RouteToAdd {
  name: string;
  params?: object;
  /** Custom key; generated when omitted. */
  key?: string;
}
