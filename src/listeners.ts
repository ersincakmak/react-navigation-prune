import { pruneImpl } from './actions.js';
import type { NavigationLike, ParamListLike, PruneOptions, RouteLike, ScreenNames } from './types.js';

/**
 * Declarative variant for a screen's `listeners` prop (v5+):
 *
 * <Stack.Screen name="Success" listeners={pruneListeners({ after: 'Cart' })} />
 *
 * Uses the screen's own `route.key` as the anchor, so it is exact even with
 * duplicate screen names.
 *
 * Pass your param list for type-checked screen names:
 * `pruneListeners<RootStackParamList>({ after: 'Cart' })`.
 */
export function pruneListeners<ParamList extends ParamListLike = never>(
  options: PruneOptions<ScreenNames<ParamList, unknown>>,
  config: { event?: 'focus' | 'transitionEnd' } = {}
) {
  const event = config.event ?? 'transitionEnd';
  return ({ navigation, route }: { navigation: NavigationLike; route: RouteLike }) => ({
    [event]: (e: any) => {
      if (event === 'transitionEnd' && e?.data?.closing) return;
      pruneImpl(navigation, { ...(options as PruneOptions), anchorKey: route.key });
    },
  });
}
