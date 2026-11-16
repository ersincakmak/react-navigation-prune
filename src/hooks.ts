import { useEffect, useRef } from 'react';
import { pruneImpl } from './actions.js';
import type { NavigationLike, ParamListLike, PruneOptions, ScreenNames } from './types.js';

declare function setTimeout(cb: () => void, ms: number): unknown;
declare function clearTimeout(handle: unknown): void;

export interface UsePruneConfig {
  /**
   * - `'transitionEnd'` (default): prune after the screen's enter animation, so
   *   no state change happens mid-animation. Falls back to a timer when the
   *   navigator emits no `transitionEnd` (e.g. no animation, tabs).
   * - `'immediate'`: prune right after mount.
   */
  when?: 'immediate' | 'transitionEnd';
  /** Fallback delay for `'transitionEnd'`, in ms. Default 500. */
  fallbackMs?: number;
  /** Set to `false` to skip pruning. Default `true`. */
  enabled?: boolean;
}

/**
 * Prunes the stack once when the screen mounts.
 * Pass `anchorKey: route.key` for full precision when other screens could be
 * pushed before the prune runs.
 *
 * Idempotent: running twice (e.g. React StrictMode) is a no-op the second time.
 */
export function usePrune<ParamList extends ParamListLike = never, N extends NavigationLike = NavigationLike>(
  navigation: N,
  options: PruneOptions<ScreenNames<ParamList, N>>,
  config: UsePruneConfig = {}
): void {
  const optionsRef = useRef(options as PruneOptions);
  optionsRef.current = options as PruneOptions;
  const { when = 'transitionEnd', fallbackMs = 500, enabled = true } = config;

  useEffect(() => {
    if (!enabled) return undefined;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      pruneImpl(navigation, optionsRef.current);
    };

    if (when === 'immediate' || typeof navigation.addListener !== 'function') {
      run();
      return undefined;
    }

    const unsubscribe = navigation.addListener('transitionEnd', (e: any) => {
      if (!e?.data?.closing) run();
    });
    const timer = setTimeout(run, fallbackMs);
    return () => {
      done = true;
      clearTimeout(timer);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [navigation, when, fallbackMs, enabled]);
}
