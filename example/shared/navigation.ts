// The demo's navigation tree, typed once for every version.
// Type-only imports: each app's tsconfig maps `@react-navigation/*` to its own
// node_modules, so this file is checked against v5, v6 and v7 separately.
import type { StackScreenProps } from '@react-navigation/stack';

export type Mode =
  | 'navigate'
  | 'hook'
  | 'listener'
  | 'imperative'
  | 'inclusive'
  | 'keep'
  | 'dup'
  | 'nested';

/** Root stack: the checkout flow. */
export type RootStackParamList = {
  Home: undefined;
  Cart: { mode: Mode; round?: number };
  Step: { mode: Mode; n: number };
  Done: { mode: Mode };
  Address: { mode: Mode };
  Payment: { mode: Mode };
  Success: { mode: Mode };
  Nested: undefined;
};

/** Stack rendered inside the root stack's `Nested` screen. */
export type NestedStackParamList = {
  InnerA: undefined;
  InnerB: undefined;
};

export type RootScreenProps<K extends keyof RootStackParamList> = StackScreenProps<
  RootStackParamList,
  K
>;

export type NestedScreenProps<K extends keyof NestedStackParamList> = StackScreenProps<
  NestedStackParamList,
  K
>;

// v6/v7: types `useNavigation()` without a generic. Harmless on v5.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}
