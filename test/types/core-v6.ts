// Type-level tests against the real @react-navigation/core v6 types.
// Compiled by `pnpm typecheck`; every @ts-expect-error must be a real error.
import type { NavigationProp, NavigationState } from 'core-v6';
import { prune, pruneListeners, pruneState, pushAndPrune, pushAndPruneState, usePrune } from '../../src/index.js';

type RootStackParamList = {
  Home: undefined;
  Cart: undefined;
  Address: { mode: string } | undefined;
  Payment: { amount: number };
  Success: undefined;
};
type InnerParamList = { InnerA: undefined; InnerB: undefined };

declare const nav: NavigationProp<RootStackParamList, 'Payment'>;
declare const inner: NavigationProp<InnerParamList>;
declare const loose: NavigationProp<Record<string, object | undefined>>;
declare const anyNav: any;
declare const state: NavigationState<RootStackParamList>;

// names inferred from the navigation object
prune(nav, { after: 'Cart' });
prune(nav, { from: ['Cart', 'Address'], keep: 'Address', match: 'farthest' });
prune(nav, { after: (route) => route.name === 'Cart' });
// @ts-expect-error unknown screen
prune(nav, { after: 'Kart' });
// @ts-expect-error unknown screen in keep
prune(nav, { after: 'Cart', keep: ['Adress'] });
// @ts-expect-error unknown screen in a list
prune(nav, { from: ['Cart', 'Nope'] });
// @ts-expect-error predicate route names are typed
prune(nav, { after: (route) => route.name === 'Nope' });
// @ts-expect-error after and from are exclusive
prune(nav, { after: 'Cart', from: 'Cart' });

// start screen in a parent navigator: pass its param list explicitly
// @ts-expect-error Cart is not in the inner navigator
prune(inner, { after: 'Cart' });
prune<RootStackParamList>(inner, { after: 'Cart' });
// @ts-expect-error explicit param list is checked too
prune<RootStackParamList>(inner, { after: 'InnerA' });

// untyped navigation objects accept any name
prune(loose, { after: 'Anything' });
prune(anyNav, { after: 'Anything' });

// pushAndPrune: name inferred; params checked with an explicit param list
pushAndPrune(nav, { name: 'Success' }, { after: 'Cart' });
// @ts-expect-error unknown target screen
pushAndPrune(nav, { name: 'Sucess' }, { after: 'Cart' });
pushAndPrune<RootStackParamList>(nav, { name: 'Payment', params: { amount: 1 } }, { after: 'Cart' });
// @ts-expect-error Payment requires params
pushAndPrune<RootStackParamList>(nav, { name: 'Payment' }, { after: 'Cart' });
// @ts-expect-error wrong params
pushAndPrune<RootStackParamList>(nav, { name: 'Payment', params: { amount: '1' } }, { after: 'Cart' });

// hook and listeners
usePrune(nav, { after: 'Cart', anchorKey: 'k' }, { when: 'immediate' });
// @ts-expect-error unknown screen
usePrune(nav, { after: 'Kart' });
pruneListeners<RootStackParamList>({ after: 'Cart' });
// @ts-expect-error unknown screen
pruneListeners<RootStackParamList>({ after: 'Kart' });
pruneListeners({ after: 'Anything' });

// pure functions: names come from the state type
pruneState(state, { after: 'Cart' });
// @ts-expect-error unknown screen
pruneState(state, { after: 'Kart' });
pushAndPruneState(state, { key: 'k', name: 'Success' }, { from: 'Cart' });
// @ts-expect-error unknown screen
pushAndPruneState(state, { key: 'k', name: 'Success' }, { from: 'Kart' });
