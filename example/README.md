# Examples

Four minimal Expo apps to try every feature of `react-navigation-stack-pruner` by hand (or from an automation agent driving the iOS Simulator). They are **not** part of the published package, the root pnpm workspace or CI.

| App | React Navigation | Notes |
| --- | --- | --- |
| `v5/` | `@react-navigation/native@5` + `stack@5` | deprecated, see known issues |
| `v6/` | `@react-navigation/native@6` + `stack@6` | deprecated, see known issues |
| `v7/` | `@react-navigation/native@7` + `stack@7` | |
| `v8/` | `@react-navigation/native@8.0.0-alpha.51` + `stack@8.0.0-alpha.60` | pre-release |

All use Expo SDK 58 (React Native 0.88, React 19) and only modules available in Expo Go. They use the JS stack (`@react-navigation/stack`) because it emits `transitionEnd`.

## Run

```sh
cd example/v7
pnpm install
pnpm start        # then press `i` for the iOS Simulator (Expo Go)
```

Each app is standalone: it has its own `pnpm-workspace.yaml` (empty `packages: []`, so pnpm never attaches it to the root workspace), its own lockfile and an `.npmrc` with `node-linker=hoisted` (required by Metro/Expo). Installing never touches the root `pnpm-lock.yaml`. You can also pass `--ignore-workspace` to be explicit.

## Layout

```
example/
  shared/            plain TS/TSX demo code, imports only react, react-native and the library
    createDemoApp.tsx  all screens + navigator wiring, driven by a config
    ui.tsx             Frame (version label, stack readout, mount counters) and Button
    mounts.ts          per-route-key mount counter
    navUtils.ts        v5/v6+ duck-typed navigation helpers
  v5 v6 v7 v8/       App.tsx passes NavigationContainer + createStackNavigator to createDemoApp
```

`shared/` never imports `@react-navigation/*`; each `App.tsx` supplies the version-specific pieces.

## How the library is consumed from source

Nothing is installed or built for the library.

- `metro.config.js` adds the repo's `src/` and `example/shared/` to `watchFolders`.
- A custom `resolveRequest` maps `react-navigation-stack-pruner` to `../../src/index.ts`, and strips the `.js` suffix from the library's relative ESM imports (`./actions.js` becomes `./actions.ts`).
- `nodeModulesPaths` points only at the app's `node_modules` and `disableHierarchicalLookup` is on, so the repo root `node_modules` is never searched. `react` and `react-native` requested from `shared/` or `src/` are resolved as if from the app, so there is exactly one copy of React.
- `tsconfig.json` has a `paths` entry for `react-navigation-stack-pruner` (and maps `react` / `react-native` types to the app's copy so `shared/` type-checks). `app.json` sets `experiments.tsconfigPaths: false` so Metro does not apply those type-only mappings.

Edit anything under `src/` and Fast Refresh picks it up.

## What every screen shows

- `version-label`: `RN Nav v7`
- `screen-name`
- `stack-readout`: `Stack: Home › Cart › Success` (root navigator, updated on `state` / `focus` events)
- `local-readout`: inner navigator stack (only on nested screens)
- `mount-count`: how many times this route key has mounted
- `mount-log`: `Name=count` for every route currently in the tree
- Buttons: `btn-next`, `btn-pay`, `btn-back`, `btn-reset` (Reset demo, resets the root navigator to Home and clears counters), plus scenario buttons below.

## Manual test checklist

"Mounts" means `mount-log` after the step; every kept screen must stay at `=1` (a higher value means a remount).

| # | Scenario | Steps (testIDs) | Expected stack | Expected mounts |
| --- | --- | --- | --- | --- |
| 1 | `navigateAndPrune` | Home `btn-s1-navigate`, `btn-next` x2 (Cart, Address), Payment `btn-pay` | `Home › Cart › Success`. `btn-back` goes to Cart | Home=1 Cart=1 Success=1 (Address, Payment gone) |
| 2 | `usePruneOnMount` | `btn-s2-hook`, `btn-next` x2, `btn-pay`, wait about 0.5 s | first `Home › Cart › Address › Payment › Success`, then `Home › Cart › Success`. Back goes to Cart | Home=1 Cart=1 Success=1 |
| 3 | `createPruneListeners` | `btn-s3-listener`, `btn-next` x2, `btn-pay` | prunes on `transitionEnd` to `Home › Cart › Success` | Home=1 Cart=1 Success=1 |
| 4 | imperative `pruneStack` | `btn-s4-imperative`, `btn-next` x2, on Payment `btn-prune` | `Home › Cart › Payment` (Address removed). Pressing `btn-prune` again changes nothing | Home=1 Cart=1 Payment=1 |
| 5a | duplicates, nearest | `btn-s5-duplicates`, `btn-next` x4 to reach Done (`Home › Cart › Step › Cart › Step › Done`), `btn-prune-nearest` | `Home › Cart › Step › Cart › Done` | all kept screens =1 |
| 5b | duplicates, farthest | same, then `btn-prune-farthest` (after Reset demo) | `Home › Cart › Done` | Home=1 Cart=1 Done=1 |
| 6a | `inclusive: true` | `btn-s6-inclusive`, `btn-next` x2, `btn-pay` | `Home › Success` | Home=1 Success=1 |
| 6b | `keep: ['Address']` | `btn-s6-keep`, `btn-next` x2, `btn-pay` | `Home › Cart › Address › Success` | Home=1 Cart=1 Address=1 Success=1 (Payment gone) |
| 7a | nested, auto parent | `btn-s7-nested`, `btn-next` x2 (Cart, Address, then Nested/InnerA), InnerA `btn-next`, InnerB `btn-prune-auto` | root `Home › Cart › Nested` (Address removed), local `InnerA › InnerB` unchanged | Nested and Inner screens stay =1 |
| 7b | nested, `navigatorId` (v6/v7 only) | same, InnerB `btn-prune-id` | same as 7a | same as 7a |
| 8 | Reset demo | `btn-reset` from any screen | `Home` | Home=1 (counters cleared) |

Scenario 2: the Payment to Success transition first shows the unpruned stack, then prunes after the enter animation (`transitionEnd`, with a 500 ms fallback timer).

## Known issues

- v5 and v6 are deprecated. They bundle and type-check against RN 0.88 / React 19 here, but they are not supported on that stack, and runtime behaviour in Expo Go has not been exercised automatically. Do not expect fixes for incompatibilities.
- v5 `@react-navigation/stack` peers on `@react-native-community/masked-view` (auto-installed by pnpm). It only matters for the float header, which the demo disables.
- v8 is an alpha (`8.0.0-alpha.51` / `stack 8.0.0-alpha.60`). It has no navigator ids, so the `navigatorId` button is hidden on v5 and v8.
- Expo's `react-native-screens` / `gesture-handler` versions come from `npx expo install` for SDK 58 and are shared by all four apps.
