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
- `test/integration/` – runs the same scenarios (`scenarios.js` + `harness.js`) against real `@react-navigation/core`: v5/v6/v7 on React 18 (root devDependencies, npm aliases `core-vN`), v7/v8 on React 19 via the private workspace package `test/react19/` (its `setup.js` redirects every `require('react')` in that process to React 19 so there is a single React instance). A core that fails to load must fail the suite, never skip.
- v8 removed navigator ids and `getParent(id)` takes a screen name there; `navigatorId` is only honoured when `getId` exists (v6/v7). Nested targeting otherwise relies on walking parents (`findTarget` in `src/actions.ts`).

## Commands
- Package manager: **pnpm** (pinned via `packageManager`, use corepack). Do not add package-lock.json or yarn.lock.
- `pnpm typecheck`
- `pnpm build` → `lib/commonjs`, `lib/module`, `lib/typescript`
- `pnpm test` → build + all tests
- `pnpm pack --dry-run` → check the published files

## Options semantics
- `from` (string | string[] | predicate): flow start, searched in `[0, anchor)`.
- `match`: `'nearest'` (default, closest to the anchor) or `'farthest'` (closest to the stack bottom) when `from` occurs more than once.
- `inclusive`: also remove `from`. `keep`: routes in the range to keep anyway.
- `anchorKey`: upper bound (kept); defaults to the focused route. `navigatorId`: pin a navigator by `id` (v6/v7). Default: current navigator, else nearest parent containing `from`.
