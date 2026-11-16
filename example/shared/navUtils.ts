// Version-agnostic helpers over a `navigation` object (v5 uses dangerouslyGet*).
import type { NavigationLike, NavigationStateLike } from 'react-navigation-prune';

/** The members the demo UI uses, present on every version's stack navigation. */
export interface DemoNavigation extends NavigationLike {
  goBack(): void;
  addListener(type: 'state' | 'focus', callback: (e: unknown) => void): () => void;
}

export interface DemoRoute {
  key: string;
  name: string;
}

export function getNavState(nav: DemoNavigation): NavigationStateLike | undefined {
  const fn = nav.getState ?? nav.dangerouslyGetState;
  return fn ? fn.call(nav) : undefined;
}

export function getNavParent(nav: DemoNavigation): DemoNavigation | undefined {
  const fn = nav.getParent ?? nav.dangerouslyGetParent;
  return fn ? fn.call(nav) : undefined;
}

/** [nav, parent, grandparent, ..., root] */
export function getAncestors(nav: DemoNavigation): DemoNavigation[] {
  const list: DemoNavigation[] = [];
  let current: DemoNavigation | undefined = nav;
  while (current && list.length < 10) {
    list.push(current);
    current = getNavParent(current);
  }
  return list;
}

export function routeNames(state: NavigationStateLike | undefined): string[] {
  return state?.routes ? state.routes.map((r) => r.name) : [];
}

/** Keys of every route in a (possibly nested) navigation state. */
export function collectKeys(
  state: NavigationStateLike | undefined,
  out: DemoRoute[] = []
): DemoRoute[] {
  for (const r of state?.routes ?? []) {
    out.push({ key: r.key, name: r.name });
    if (r.state) collectKeys(r.state as NavigationStateLike, out);
  }
  return out;
}
