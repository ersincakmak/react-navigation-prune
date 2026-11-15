# react-navigation-stack-pruner

Removes intermediate screens from a React Navigation stack (e.g. everything between a flow's start screen and the current screen) in **one RESET dispatch**, for React Navigation v5, v6, v7 and v8.

## Hard rules
- **Zero runtime dependencies.** `dependencies` stays `{}`. Never import from `@react-navigation/*` in `src/` (not even types). Use the structural types in `src/types.ts` and duck typing (`getState ?? dangerouslyGetState`, `getParent ?? dangerouslyGetParent`).
- `react` is the only peer dependency and is used only in `src/hooks.ts`.
- Build the action by hand: `{ type: 'RESET', payload: state }` (`resetAction`). Dispatch via the thunk form `navigation.dispatch(state => action)`, which exists in v5→v8.
- Never mutate state. Reuse route objects so keys are preserved (no remounts).
- `pruneState` must return the **same reference** when nothing changes; `pruneStack` must not dispatch in that case.
- Keep everything O(n), single pass, no allocations in hot paths beyond the new routes array.
- Relative imports in `src/` use the `.js` extension (valid ESM output).
- Git commits: no `Co-Authored-By` or other Claude/AI attribution lines. The repo owner is the only author.

## Layout
- `src/pruneState.ts` – pure core (`pruneState`, `findStartIndex`, `createRouteKey`)
- `src/actions.ts` – `pruneStack`, `navigateAndPrune`, `navigateAndPruneState`, `resolveNavigation`, `resetAction`
- `src/hooks.ts` – `usePruneOnMount` (transitionEnd + fallback timer, idempotent)
- `src/listeners.ts` – `createPruneListeners` for a screen's `listeners` prop
- `src/types.ts`, `src/matchers.ts`, `src/dev.ts` (`__DEV__`-guarded warnings)
- `test/*.test.js` – `node:test` against the built CommonJS output (`lib/commonjs`). No Jest/Babel.
- `test/integration/` – runs the same scenarios against real `@react-navigation/core` v5/v6/v7/v8, installed as npm aliases (devDependencies only).

## Commands
- `npm run typecheck`
- `npm run build` → `lib/commonjs`, `lib/module`, `lib/typescript`
- `npm test` → build + all tests
- `npm pack --dry-run` → check the published files

## Options semantics
- `from` (string | string[] | predicate): flow start, searched in `[0, anchor)`.
- `match`: `'nearest'` (default, closest to the anchor) or `'farthest'` (closest to the stack bottom) when `from` occurs more than once.
- `inclusive`: also remove `from`. `keep`: routes in the range to keep anyway.
- `anchorKey`: upper bound (kept); defaults to the focused route. `navigatorId`: target a parent navigator by `id` (v6+).
