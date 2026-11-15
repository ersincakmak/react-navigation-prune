# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-16

### Added

- `pruneStack` removes the screens between a flow's start (`from`) and the focused screen in one `RESET` and returns `false` without dispatching when there is nothing to remove.
- `navigateAndPrune` pushes a screen and prunes the intermediate screens in one state update.
- `usePruneOnMount` prunes once when a screen mounts, with `when` (`'transitionEnd'` or `'immediate'`), `fallbackMs` and `enabled` options. It is idempotent.
- `createPruneListeners` returns a `listeners` value for `Stack.Screen`, anchored on the screen's own route key. Supports `'transitionEnd'` and `'focus'` events.
- Pure helpers `pruneState`, `navigateAndPruneState`, `findStartIndex`, `createRouteKey`, `matches`, `resetAction` and `resolveNavigation` for tests and custom actions.
- Options: `from`, `match` (`'nearest'` or `'farthest'`), `inclusive`, `keep`, `anchorKey` and `navigatorId` (v6/v7).
- Automatic target detection for nested navigators: if `from` is not in the current navigator, parents are searched.
- Support for React Navigation v5, v6 and v7, with zero runtime dependencies.
- TypeScript declarations and CommonJS and ES module builds.
