# react-navigation-stack-pruner

Remove intermediate screens from a React Navigation stack (everything between a flow's start screen and the current screen) in a **single `RESET`**. Works with React Navigation v5, v6 and v7.

[![npm version](https://img.shields.io/npm/v/react-navigation-stack-pruner.svg)](https://www.npmjs.com/package/react-navigation-stack-pruner)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-navigation-stack-pruner.svg)](https://bundlephobia.com/package/react-navigation-stack-pruner)
[![license](https://img.shields.io/npm/l/react-navigation-stack-pruner.svg)](./LICENSE)

## Why

- **Clean back stack after a flow.** After `Cart → Address → Payment → Success`, the user should not be able to swipe back into the checkout steps. This removes them.
- **One update, no remounts.** A single `RESET` replaces the whole stack. Remaining route objects are reused, so their keys are preserved and screens are not remounted.
- **No-op when there is nothing to do.** If nothing lies between the flow start and the current screen, nothing is dispatched.
- **Zero dependencies.** Only `react` is used, and only as a peer dependency by the hooks.
- **Version-agnostic.** Works with React Navigation v5, v6 and v7.

## Install

```sh
npm install react-navigation-stack-pruner
```

```sh
yarn add react-navigation-stack-pruner
```

```sh
pnpm add react-navigation-stack-pruner
```

## Quick start

Example flow: `Home → Cart → Address → Payment → Success`. Pruning from `Cart` leaves `Home → Cart → Success`.

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createPruneListeners,
  navigateAndPrune,
  pruneStack,
  usePruneOnMount,
} from 'react-navigation-stack-pruner';

const Stack = createNativeStackNavigator();

<Stack.Navigator>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Cart" component={CartScreen} />
  <Stack.Screen name="Address" component={AddressScreen} />
  <Stack.Screen name="Payment" component={PaymentScreen} />
  <Stack.Screen
    name="Success"
    component={SuccessScreen}
    listeners={createPruneListeners({ from: 'Cart' })} // (c)
  />
</Stack.Navigator>;
```

**(a) Push a screen and prune in one update**, from the Payment screen:

```tsx
function PaymentScreen({ navigation }) {
  const onPaid = () =>
    navigateAndPrune(navigation, { name: 'Success' }, { from: 'Cart' });
  // ...
}
```

**(b) Prune once when a screen mounts**, inside the Success screen:

```tsx
function SuccessScreen({ navigation }) {
  usePruneOnMount(navigation, { from: 'Cart' });
  // ...
}
```

**(c) Declarative listener** on the screen, shown above on `Stack.Screen`. It prunes when `Success` finishes its transition.

**(d) Prune on demand**, for example from a button press:

```tsx
<Button
  title="Clean up"
  onPress={() => pruneStack(navigation, { from: 'Cart' })}
/>
```

The four patterns are independent. Use whichever fits your flow. Do not combine (b) and (c) for the same screen unless you need both.

## Options

These options are shared by `pruneStack`, `navigateAndPrune`, `usePruneOnMount`, `createPruneListeners` and the pure helpers.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `from` | `string \| readonly string[] \| (route, index) => boolean` | required | The flow's first screen. Everything between it and the anchor is removed. The anchor is searched in the range `[0, anchor)`. |
| `match` | `'nearest' \| 'farthest'` | `'nearest'` | Which occurrence to use when `from` appears more than once. |
| `inclusive` | `boolean` | `false` | Also remove the `from` screen itself. |
| `keep` | `string \| readonly string[] \| (route, index) => boolean` | none | Screens inside the removed range that must be kept anyway. |
| `anchorKey` | `string` | focused route | Key of the upper-bound route, which is always kept. Accepted by `pruneStack`, `usePruneOnMount` and `pruneState`. `navigateAndPrune` and `createPruneListeners` set it for you. |
| `navigatorId` | `string` | auto | Pin a navigator by its `id` prop (v6/v7 only). Usually unnecessary: by default the current navigator is used and, if it does not contain `from`, the parents are searched automatically (all versions). |

### `match` with duplicate screen names

Suppose the stack is `Home → Cart → Browse → Cart → Address → Payment`, and the call is `{ from: 'Cart' }` with the anchor on `Payment`.

- `match: 'nearest'` (default) uses the second `Cart`. Result: `Home → Cart → Browse → Cart → Payment`.
- `match: 'farthest'` uses the first `Cart`. Result: `Home → Cart → Payment`.

## API reference

Everything exported from the package entry point.

### Actions

| Export | Signature | Description |
| --- | --- | --- |
| `pruneStack` | `(navigation, options: PruneOptions & { anchorKey? }) => boolean` | Removes the screens in the range in one `RESET`. Returns `true` if it dispatched, `false` if there was nothing to remove. |
| `navigateAndPrune` | `(navigation, route: RouteToAdd, options: PruneOptions) => void` | Pushes `route` and prunes the range in one `RESET`. `route.name` must belong to the target navigator. |
| `resetAction` | `(state: NavigationStateLike) => ResetActionLike` | Builds `{ type: 'RESET', payload: state }`. |
| `resolveNavigation` | `(navigation, navigatorId?) => NavigationLike \| undefined` | Returns the navigator to act on: the current one, or the parent with the given `id`. |

### Pure helpers

Useful for tests and custom actions. They take and return state objects and do not dispatch.

| Export | Signature | Description |
| --- | --- | --- |
| `pruneState` | `(state, options: PruneStateOptions) => state` | Returns a new state with the range removed. Returns the **same reference** when nothing changes. |
| `navigateAndPruneState` | `(state, route: RouteLike, options: PruneStateOptions) => state` | Pushes `route` on top of the focused route, then prunes with `route.key` as the anchor. |
| `findStartIndex` | `(state, options, end: number) => number` | Index of the `from` screen within `[0, end)`, or `-1`. |
| `createRouteKey` | `(name: string) => string` | Generates a collision-safe route key in React Navigation's `name-id` shape. |
| `matches` | `(matcher: RouteMatcher, route, index) => boolean` | Tests a route against a `from` / `keep` matcher. |

### Hooks and listeners

| Export | Signature | Description |
| --- | --- | --- |
| `usePruneOnMount` | `(navigation, options: PruneOptions & { anchorKey? }, config?: PruneOnMountConfig) => void` | Prunes once when the screen mounts. Idempotent, so running it twice (for example in StrictMode) is safe. |
| `createPruneListeners` | `(options: PruneOptions, config?: { event?: 'transitionEnd' \| 'focus' }) => listenersFactory` | Returns a value for a screen's `listeners` prop. It uses the screen's own `route.key` as the anchor. |

`usePruneOnMount` config (`PruneOnMountConfig`):

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `when` | `'transitionEnd' \| 'immediate'` | `'transitionEnd'` | `'transitionEnd'` prunes after the enter animation and falls back to `fallbackMs` if no event arrives. `'immediate'` prunes right after mount. |
| `fallbackMs` | `number` | `500` | Timer used when `when` is `'transitionEnd'`, for navigators that emit no `transitionEnd` (for example tabs or no-animation screens). |
| `enabled` | `boolean` | `true` | Set to `false` to skip pruning. |

### Types

`NavigationLike`, `NavigationStateLike`, `RouteLike`, `RouteMatcher`, `PruneOptions`, `PruneStateOptions`, `RouteToAdd`, `ResetActionLike`, `PruneOnMountConfig`.

## Compatibility

| React Navigation | Support |
| --- | --- |
| v5 | Supported. The package uses `dangerouslyGetState` and `dangerouslyGetParent` automatically. |
| v6, v7 | Supported. Uses `getState`, `getParent` and `getId`. |

- Nested navigators work with zero configuration in every version: if `from` is not in the current navigator, the parents are searched and the first one containing it is pruned. `navigateAndPrune` likewise pushes into the nearest navigator that declares the target screen.
- `navigatorId` works on v6 and v7. On v5 it logs a development warning and falls back to automatic detection.
- CI runs the same integration suite against real `@react-navigation/core` v5, v6, v7 (React 18) and v7 (React 19).
- React Navigation v8 is not supported yet; support will be added after its stable release.
- `react` `>=16.8` is the only peer dependency.
- Node.js `>=18` is required for tooling.

## Performance

- **O(n), single pass.** The range is found and rebuilt in one traversal, and only the new routes array is allocated.
- **One `RESET`.** A flow exit is one state update, so there is one render and no intermediate flicker.
- **No dispatch when there is nothing to remove.** `pruneStack` checks first and returns `false`.
- **No remounts.** Route objects are reused, so their keys stay the same.
- **Fresh state.** `pruneStack` and `navigateAndPrune` compute the new state inside the dispatch thunk, so actions dispatched in the same tick are not lost.

## FAQ

**Does it work with `@react-navigation/native-stack` and the JS stack?**
Yes. Both build on the same navigation state, and the package only reads and writes that state.

**Which navigator does `navigateAndPrune` push onto?**
The navigator that owns the `navigation` object you pass in. The `route.name` must be a screen registered on that navigator. If the screen lives in a parent navigator, it is found automatically (the nearest navigator that declares it receives the push); on v6/v7 you can pin one with `navigatorId`.

**Does the pushed screen still animate?**
Yes. The new route is part of the same `RESET`, so it enters like a normal push. Only the screens in the removed range disappear.

**What happens if `from` is not in the stack?**
Nothing. The stack is left alone, and nothing is dispatched.

**Can I use it in tests without a navigator?**
Yes. Call `pruneState` or `navigateAndPruneState` with a plain state object.

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
