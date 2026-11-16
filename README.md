# react-navigation-prune

Remove intermediate screens from a React Navigation stack (everything between a flow's start screen and the current screen) in a **single `RESET`**. Works with React Navigation v5, v6 and v7.

[![npm version](https://img.shields.io/npm/v/react-navigation-prune.svg)](https://www.npmjs.com/package/react-navigation-prune)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-navigation-prune.svg)](https://bundlephobia.com/package/react-navigation-prune)
[![license](https://img.shields.io/npm/l/react-navigation-prune.svg)](./LICENSE)

## Why

- **Clean back stack after a flow.** After `Cart → Address → Payment → Success`, the user should not be able to swipe back into the checkout steps. This removes them.
- **One update, no remounts.** A single `RESET` replaces the whole stack. Remaining route objects are reused, so their keys are preserved and screens are not remounted.
- **No-op when there is nothing to do.** If nothing lies between the flow start and the current screen, nothing is dispatched.
- **Zero dependencies.** Only `react` is used, and only as a peer dependency by the hooks.
- **Version-agnostic.** Works with React Navigation v5, v6 and v7.

## Install

```sh
npm install react-navigation-prune
```

```sh
yarn add react-navigation-prune
```

```sh
pnpm add react-navigation-prune
```

## Quick start

Example flow: `Home → Cart → Address → Payment → Success`. `prune(navigation, { after: 'Cart' })` leaves `Home → Cart → Success`; `{ from: 'Cart' }` leaves `Home → Success`.

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  pruneListeners,
  pushAndPrune,
  prune,
  usePrune,
} from 'react-navigation-prune';

const Stack = createNativeStackNavigator();

<Stack.Navigator>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Cart" component={CartScreen} />
  <Stack.Screen name="Address" component={AddressScreen} />
  <Stack.Screen name="Payment" component={PaymentScreen} />
  <Stack.Screen
    name="Success"
    component={SuccessScreen}
    listeners={pruneListeners({ after: 'Cart' })} // (c)
  />
</Stack.Navigator>;
```

**(a) Push a screen and prune in one update**, from the Payment screen:

```tsx
function PaymentScreen({ navigation }) {
  const onPaid = () =>
    pushAndPrune(navigation, { name: 'Success' }, { after: 'Cart' });
  // ...
}
```

**(b) Prune once when a screen mounts**, inside the Success screen:

```tsx
function SuccessScreen({ navigation }) {
  usePrune(navigation, { after: 'Cart' });
  // ...
}
```

**(c) Declarative listener** on the screen, shown above on `Stack.Screen`. It prunes when `Success` finishes its transition.

**(d) Prune on demand**, for example from a button press:

```tsx
<Button
  title="Clean up"
  onPress={() => prune(navigation, { after: 'Cart' })}
/>
```

The four patterns are independent. Use whichever fits your flow. Do not combine (b) and (c) for the same screen unless you need both.

## Options

These options are shared by `prune`, `pushAndPrune`, `usePrune`, `pruneListeners` and the pure helpers.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `after` | `string \| readonly string[] \| (route, index) => boolean` | one of `after` / `from` | The flow's start screen, **kept**. Everything between it and the anchor is removed. Searched in `[0, anchor)`. |
| `from` | same as `after` | one of `after` / `from` | The flow's start screen, **removed too**: everything from it up to the anchor goes. |
| `match` | `'nearest' \| 'farthest'` | `'nearest'` | Which occurrence to use when the start screen appears more than once. |
| `keep` | `string \| readonly string[] \| (route, index) => boolean` | none | Screens inside the removed range that must be kept anyway. |
| `anchorKey` | `string` | focused route | Key of the upper-bound route, which is always kept. Accepted by `prune`, `usePrune` and `pruneState`. `pushAndPrune` and `pruneListeners` set it for you. |
| `navigatorId` | `string` | auto | Pin a navigator by its `id` prop (v6/v7 only). Usually unnecessary: by default the current navigator is used and, if it does not contain the start screen, the parents are searched automatically (all versions). |

### `match` with duplicate screen names

Suppose the stack is `Home → Cart → Browse → Cart → Address → Payment`, and the call is `{ after: 'Cart' }` with the anchor on `Payment`.

- `match: 'nearest'` (default) uses the second `Cart`. Result: `Home → Cart → Browse → Cart → Payment`.
- `match: 'farthest'` uses the first `Cart`. Result: `Home → Cart → Payment`.

## Type safety

Screen names are checked against your navigator's param list. Nothing extra is installed: the names are read structurally from the typed `navigation` object (v5, v6 and v7).

```tsx
type RootStackParamList = {
  Home: undefined;
  Cart: undefined;
  Payment: { amount: number };
  Success: undefined;
};

function Payment({ navigation }: StackScreenProps<RootStackParamList, 'Payment'>) {
  prune(navigation, { after: 'Cart' });            // ok
  prune(navigation, { after: 'Kart' });            // error: not a screen of this navigator
  prune(navigation, { after: 'Cart', keep: ['Adress'] }); // error
  prune(navigation, { after: (route) => route.name === 'Cart' }); // `route.name` is typed
}
```

Pass the param list explicitly when the names cannot come from `navigation`:

- **The start screen lives in a parent navigator** (auto-detected at runtime, or `navigatorId`): `prune<RootStackParamList>(navigation, { after: 'Cart' })`.
- **`pruneListeners`** is created outside any screen: `pruneListeners<RootStackParamList>({ after: 'Cart' })`.
- **Typed params for `pushAndPrune`**: `pushAndPrune<RootStackParamList>(navigation, { name: 'Payment', params: { amount: 1 } }, { after: 'Cart' })` checks `params` and requires them when the screen does.

`pruneState` and `pushAndPruneState` take the names from the state's `routeNames` type. An untyped `navigation` (`any`, or a `ParamListBase` navigator) accepts any string, as before.

## API reference

Everything exported from the package entry point.

### Actions

| Export | Signature | Description |
| --- | --- | --- |
| `prune` | `<ParamList?>(navigation, options: PruneOptions) => boolean` | Removes the screens in the range in one `RESET`. Returns `true` if it dispatched, `false` if there was nothing to remove. |
| `pushAndPrune` | `<ParamList?>(navigation, route, options: PruneOptions) => void` | Pushes `route` and prunes the range in one `RESET`. `route.name` must belong to the target navigator. |
| `resetAction` | `(state: NavigationStateLike) => ResetActionLike` | Builds `{ type: 'RESET', payload: state }`. |
| `resolveNavigation` | `(navigation, navigatorId?) => NavigationLike \| undefined` | Returns the navigator to act on: the current one, or the parent with the given `id`. |

### Pure helpers

Useful for tests and custom actions. They take and return state objects and do not dispatch.

| Export | Signature | Description |
| --- | --- | --- |
| `pruneState` | `(state, options: PruneStateOptions) => state` | Returns a new state with the range removed. Returns the **same reference** when nothing changes. |
| `pushAndPruneState` | `(state, route: RouteLike, options: PruneStateOptions) => state` | Pushes `route` on top of the focused route, then prunes with `route.key` as the anchor. |
| `findStartIndex` | `(state, options, end: number) => number` | Index of the start screen (`after` / `from`) within `[0, end)`, or `-1`. |
| `createRouteKey` | `(name: string) => string` | Generates a collision-safe route key in React Navigation's `name-id` shape. |
| `matches` | `(matcher: RouteMatcher, route, index) => boolean` | Tests a route against an `after` / `from` / `keep` matcher. |

### Hooks and listeners

| Export | Signature | Description |
| --- | --- | --- |
| `usePrune` | `<ParamList?>(navigation, options: PruneOptions, config?: UsePruneConfig) => void` | Prunes once when the screen mounts. Idempotent, so running it twice (for example in StrictMode) is safe. |
| `pruneListeners` | `<ParamList?>(options: PruneOptions, config?: { event?: 'transitionEnd' \| 'focus' }) => listenersFactory` | Returns a value for a screen's `listeners` prop. It uses the screen's own `route.key` as the anchor. |

`usePrune` config (`UsePruneConfig`):

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `when` | `'transitionEnd' \| 'immediate'` | `'transitionEnd'` | `'transitionEnd'` prunes after the enter animation and falls back to `fallbackMs` if no event arrives. `'immediate'` prunes right after mount. |
| `fallbackMs` | `number` | `500` | Timer used when `when` is `'transitionEnd'`, for navigators that emit no `transitionEnd` (for example tabs or no-animation screens). |
| `enabled` | `boolean` | `true` | Set to `false` to skip pruning. |

### Types

`NavigationLike`, `NavigationStateLike`, `RouteLike`, `RouteMatcher`, `PruneOptions`, `PruneStateOptions`, `RouteToAdd`, `ResetActionLike`, `UsePruneConfig`.

Type-level helpers: `ScreenNames<ParamList, Navigation>`, `RouteNameOf<Navigation>`, `StateRouteNames<State>`, `TypedRouteToAdd<ParamList, Name>`, `ParamListLike`. The option types take the accepted screen names as a parameter, e.g. `PruneOptions<keyof RootStackParamList>`.

## Compatibility

| React Navigation | Support |
| --- | --- |
| v5 | Supported. The package uses `dangerouslyGetState` and `dangerouslyGetParent` automatically. |
| v6, v7 | Supported. Uses `getState`, `getParent` and `getId`. |

- Nested navigators work with zero configuration in every version: if the start screen is not in the current navigator, the parents are searched and the first one containing it is pruned. `pushAndPrune` likewise pushes into the nearest navigator that declares the target screen.
- `navigatorId` works on v6 and v7. On v5 it logs a development warning and falls back to automatic detection.
- CI runs the same integration suite against real `@react-navigation/core` v5, v6, v7 (React 18) and v7 (React 19).
- React Navigation v8 is not supported yet; support will be added after its stable release.
- `react` `>=16.8` is the only peer dependency.
- Node.js `>=18` is required for tooling.

## Performance

- **O(n), single pass.** The range is found and rebuilt in one traversal, and only the new routes array is allocated.
- **One `RESET`.** A flow exit is one state update, so there is one render and no intermediate flicker.
- **No dispatch when there is nothing to remove.** `prune` checks first and returns `false`.
- **No remounts.** Route objects are reused, so their keys stay the same.
- **Fresh state.** `prune` and `pushAndPrune` compute the new state inside the dispatch thunk, so actions dispatched in the same tick are not lost.

## FAQ

**Does it work with `@react-navigation/native-stack` and the JS stack?**
Yes. Both build on the same navigation state, and the package only reads and writes that state.

**Which navigator does `pushAndPrune` push onto?**
The navigator that owns the `navigation` object you pass in. The `route.name` must be a screen registered on that navigator. If the screen lives in a parent navigator, it is found automatically (the nearest navigator that declares it receives the push); on v6/v7 you can pin one with `navigatorId`.

**Does the pushed screen still animate?**
Yes. The new route is part of the same `RESET`, so it enters like a normal push. Only the screens in the removed range disappear.

**What happens if the start screen is not in the stack?**
Nothing. The stack is left alone, and nothing is dispatched.

**Can I use it in tests without a navigator?**
Yes. Call `pruneState` or `pushAndPruneState` with a plain state object.

## Contributing

```sh
pnpm install
pnpm test       # build + node:test suites
pnpm typecheck
pnpm pack --dry-run
```

The package manager is pinned in `package.json` (`packageManager`). Use [corepack](https://nodejs.org/api/corepack.html) or install that pnpm version. Do not add a `package-lock.json` or `yarn.lock`.

## License

[MIT](./LICENSE)
