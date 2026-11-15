import type { RouteLike, RouteMatcher } from './types.js';

export function matches(matcher: RouteMatcher, route: RouteLike, index: number): boolean {
  if (typeof matcher === 'string') return route.name === matcher;
  if (typeof matcher === 'function') return matcher(route, index);
  // array: small, linear scan beats Set allocation for typical sizes
  for (let i = 0; i < matcher.length; i++) if (matcher[i] === route.name) return true;
  return false;
}
