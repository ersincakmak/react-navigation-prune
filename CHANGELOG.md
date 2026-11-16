# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Type-safe screen names. `after`, `from`, `keep` and the predicate's `route.name` are checked against the navigator's param list, inferred from the typed `navigation` object (v5, v6, v7) or the state's `routeNames`. An optional `ParamList` type argument (`prune<RootStackParamList>(...)`) covers parent navigators and `pruneListeners`, and checks `pushAndPrune` params.
- Type tests against the real `@react-navigation/core` v5, v6 and v7 declarations (`test/types/`, run by `pnpm typecheck`).

### Fixed

- Typed v6 navigation objects (`NavigationProp<ParamList>` of a navigator without an `id`) were not assignable to `NavigationLike`.

## [0.1.0] - 2026-11-16

### Added

- `prune` removes the screens between a flow's start (`after` / `from`) and the focused screen in one `RESET` and returns `false` without dispatching when there is nothing to remove.
- `pushAndPrune` pushes a screen and prunes the intermediate screens in one state update.
- `usePrune` prunes once when a screen mounts, with `when` (`'transitionEnd'` or `'immediate'`), `fallbackMs` and `enabled` options. It is idempotent.
- `pruneListeners` returns a `listeners` value for `Stack.Screen`, anchored on the screen's own route key. Supports `'transitionEnd'` and `'focus'` events.
- Pure helpers `pruneState`, `pushAndPruneState`, `findStartIndex`, `createRouteKey`, `matches`, `resetAction` and `resolveNavigation` for tests and custom actions.
- Options: `after` (keep the start screen) or `from` (remove it too), `match` (`'nearest'` or `'farthest'`), `keep`, `anchorKey` and `navigatorId` (v6/v7).
- Automatic target detection for nested navigators: if the start screen is not in the current navigator, parents are searched.
- Support for React Navigation v5, v6 and v7, with zero runtime dependencies.
- TypeScript declarations and CommonJS and ES module builds.
