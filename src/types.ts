/**
 * Minimal structural types. We intentionally do NOT import anything from
 * `@react-navigation/*` so the package works with v5, v6 and v7 and has
 * zero runtime (and zero type) dependencies.
 */

export interface RouteLike<Name extends string = string> {
  key: string;
  name: Name;
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
  // Method syntax on purpose: parameters are checked bivariantly, so the
  // typed navigation objects of every version are assignable (e.g. v6's
  // `getParent(id?: undefined)` on a navigator without an id).
  dispatch(action: any): void;
  /** v5+ */
  getState?(): any;
  /** v5 */
  dangerouslyGetState?(): any;
  /** v6+ */
  getId?(): string | undefined;
  /** v6+ (`id` argument), v5 has no ids */
  getParent?(id?: any): any;
  /** v5 */
  dangerouslyGetParent?(): any;
  addListener?(type: any, callback: (e: any) => void): () => void;
}

export type { Thunk };

/**
 * A screen name, a list of names, or a predicate. `Name` narrows the accepted
 * names to the screens of your navigator (see `ScreenNames`).
 */
export type RouteMatcher<Name extends string = string> =
  | Name
  | readonly Name[]
  | ((route: RouteLike<Name>, index: number) => boolean);

/**
 * Where the flow starts. Pass exactly one:
 * - `after`: keep this screen, remove everything between it and the anchor.
 * - `from`: remove this screen too.
 */
export type PruneStart<Name extends string = string> =
  | { after: RouteMatcher<Name>; from?: undefined }
  | { from: RouteMatcher<Name>; after?: undefined };

export interface PruneCommonOptions<Name extends string = string> {
  /**
   * Which occurrence of the start screen to use if it appears more than once.
   * - `'nearest'` (default): the one closest to the anchor (top of the stack)
   * - `'farthest'`: the one closest to the bottom of the stack
   */
  match?: 'nearest' | 'farthest';
  /** Screens inside the removed range that must be kept anyway. */
  keep?: RouteMatcher<Name>;
}

export type PruneOptions<Name extends string = string> = PruneStart<Name> &
  PruneCommonOptions<Name> & {
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

export type PruneStateOptions<Name extends string = string> = PruneStart<Name> &
  PruneCommonOptions<Name> & {
    /**
     * Key of the route that acts as the upper bound (it is always kept).
     * Defaults to the focused route (`state.routes[state.index]`).
     */
    anchorKey?: string;
  };

export interface RouteToAdd<Name extends string = string, Params = object | undefined> {
  name: Name;
  params?: Params;
  /** Custom key; generated when omitted. */
  key?: string;
}

// ---------------------------------------------------------------------------
// Type safety. Everything below is type-level only (no runtime cost) and
// works structurally with the navigation types of v5, v6 and v7.
// ---------------------------------------------------------------------------

/** Any param list, e.g. `{ Home: undefined; Cart: { id: string } }`. */
export type ParamListLike = object;

type IsAny<T> = 0 extends 1 & T ? true : false;

/** Blocks inference from a position (works on every TS version, unlike `NoInfer`). */
type NoInferLegacy<T> = [T][T extends any ? 0 : never];

type StateOf<N> = N extends { getState(): infer S }
  ? S
  : N extends { dangerouslyGetState(): infer S }
    ? S
    : undefined;

/** Screen names declared by a (typed) navigation state; `string` when untyped. */
export type StateRouteNames<S> =
  IsAny<S> extends true
    ? string
    : S extends { routeNames: ReadonlyArray<infer R> }
      ? string extends R
        ? string
        : Extract<R, string>
      : string;

/**
 * The screen names of the navigator a `navigation` object belongs to, read
 * from the `routeNames` of its typed state. Falls back to `string` when the
 * navigation object is untyped.
 */
export type RouteNameOf<N> = IsAny<N> extends true ? string : StateRouteNames<StateOf<N>>;

/**
 * Accepted screen names: the keys of `ParamList` when given explicitly,
 * otherwise inferred from the navigation object.
 */
export type ScreenNames<ParamList, N> = [ParamList] extends [never]
  ? RouteNameOf<N>
  : Extract<keyof NoInferLegacy<ParamList>, string>;

/**
 * A route to push. With an explicit `ParamList`, `params` is checked against
 * the screen (and required when the screen requires params).
 */
export type TypedRouteToAdd<ParamList, Name extends string> = [ParamList] extends [never]
  ? RouteToAdd<Name>
  : RoutesOf<NoInferLegacy<ParamList>>;

type RoutesOf<P> = {
  [K in Extract<keyof P, string>]: undefined extends P[K]
    ? { name: K; params?: P[K]; key?: string }
    : { name: K; params: P[K]; key?: string };
}[Extract<keyof P, string>];
