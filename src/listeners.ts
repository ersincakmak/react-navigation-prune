import { pruneStack } from './actions.js';
import type { NavigationLike, PruneOptions, RouteLike } from './types.js';

/**
 * Declarative variant for a screen's `listeners` prop (v5+):
 *
 * <Stack.Screen name="Success" listeners={createPruneListeners({ from: 'Cart' })} />
 *
 * Uses the screen's own `route.key` as the anchor, so it is exact even with
 * duplicate screen names.
 */
export function createPruneListeners(
  options: PruneOptions,
  config: { event?: 'focus' | 'transitionEnd' } = {}
) {
  const event = config.event ?? 'transitionEnd';
  return ({ navigation, route }: { navigation: NavigationLike; route: RouteLike }) => ({
    [event]: (e: any) => {
      if (event === 'transitionEnd' && e?.data?.closing) return;
      pruneStack(navigation, { ...options, anchorKey: route.key });
    },
  });
}
