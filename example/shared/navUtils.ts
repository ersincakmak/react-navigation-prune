// Version-agnostic helpers over a `navigation` object (v5 uses dangerouslyGet*).

export function getNavState(nav: any): any {
  const fn = nav.getState ?? nav.dangerouslyGetState;
  return fn ? fn.call(nav) : undefined;
}

export function getNavParent(nav: any): any {
  const fn = nav.getParent ?? nav.dangerouslyGetParent;
  return fn ? fn.call(nav) : undefined;
}

/** [nav, parent, grandparent, ..., root] */
export function getAncestors(nav: any): any[] {
  const list: any[] = [];
  let current = nav;
  while (current && list.length < 10) {
    list.push(current);
    current = getNavParent(current);
  }
  return list;
}

export function routeNames(state: any): string[] {
  return state?.routes ? state.routes.map((r: any) => r.name) : [];
}

/** Keys of every route in a (possibly nested) navigation state. */
export function collectKeys(state: any, out: Array<{ key: string; name: string }> = []) {
  for (const r of state?.routes ?? []) {
    out.push({ key: r.key, name: r.name });
    if (r.state) collectKeys(r.state, out);
  }
  return out;
}
