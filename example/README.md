# Examples

Three minimal Expo apps to try every feature of `react-navigation-prune` by hand (or from an automation agent driving the iOS Simulator). They are **not** part of the published package, the root pnpm workspace or CI.

| App | React Navigation | Notes |
| --- | --- | --- |
| `v5/` | `@react-navigation/native@5` + `stack@5` | Expo SDK 57 (RN 0.86, React 19.2) |
| `v6/` | `@react-navigation/native@6` + `stack@6` | Expo SDK 57 (RN 0.86, React 19.2) |
| `v7/` | `@react-navigation/native@7` + `stack@7` | Expo SDK 58 (RN 0.88, React 19.3) |

All use only modules available in Expo Go (`expo start --ios` installs the Expo Go build matching each SDK on the simulator). They use the JS stack (`@react-navigation/stack`) because it emits `transitionEnd`.

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
  v5 v6 v7/          App.tsx passes NavigationContainer + createStackNavigator to createDemoApp
```

`shared/` never imports `@react-navigation/*`; each `App.tsx` supplies the version-specific pieces.

## How the library is consumed from source

Nothing is installed or built for the library.

- `metro.config.js` adds the repo's `src/` and `example/shared/` to `watchFolders`.
- A custom `resolveRequest` maps `react-navigation-prune` to `../../src/index.ts`, and strips the `.js` suffix from the library's relative ESM imports (`./actions.js` becomes `./actions.ts`).
- `nodeModulesPaths` points only at the app's `node_modules` and `disableHierarchicalLookup` is on, so the repo root `node_modules` is never searched. `react` and `react-native` requested from `shared/` or `src/` are resolved as if from the app, so there is exactly one copy of React.
- `tsconfig.json` has a `paths` entry for `react-navigation-prune` (and maps `react` / `react-native` types to the app's copy so `shared/` type-checks). `app.json` sets `experiments.tsconfigPaths: false` so Metro does not apply those type-only mappings.

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
| 1 | `pushAndPrune` | Home `btn-s1-navigate`, `btn-next` x2 (Cart, Address), Payment `btn-pay` | `Home › Cart › Success`. `btn-back` goes to Cart | Home=1 Cart=1 Success=1 (Address, Payment gone) |
| 2 | `usePrune` | `btn-s2-hook`, `btn-next` x2, `btn-pay`, wait about 0.5 s | first `Home › Cart › Address › Payment › Success`, then `Home › Cart › Success`. Back goes to Cart | Home=1 Cart=1 Success=1 |
| 3 | `pruneListeners` | `btn-s3-listener`, `btn-next` x2, `btn-pay` | prunes on `transitionEnd` to `Home › Cart › Success` | Home=1 Cart=1 Success=1 |
| 4 | imperative `prune` | `btn-s4-imperative`, `btn-next` x2, on Payment `btn-prune` | `Home › Cart › Payment` (Address removed). Pressing `btn-prune` again changes nothing | Home=1 Cart=1 Payment=1 |
| 5a | duplicates, nearest | `btn-s5-duplicates`, `btn-next` x4 to reach Done (`Home › Cart › Step › Cart › Step › Done`), `btn-prune-nearest` | `Home › Cart › Step › Cart › Done` | all kept screens =1 |
| 5b | duplicates, farthest | same, then `btn-prune-farthest` (after Reset demo) | `Home › Cart › Done` | Home=1 Cart=1 Done=1 |
| 6a | `from: 'Cart'` (start removed too) | `btn-s6-inclusive`, `btn-next` x2, `btn-pay` | `Home › Success` | Home=1 Success=1 |
| 6b | `keep: ['Address']` | `btn-s6-keep`, `btn-next` x2, `btn-pay` | `Home › Cart › Address › Success` | Home=1 Cart=1 Address=1 Success=1 (Payment gone) |
| 7a | nested, auto parent | `btn-s7-nested`, `btn-next` x2 (Cart, Address, then Nested/InnerA), InnerA `btn-next`, InnerB `btn-prune-auto` | root `Home › Cart › Nested` (Address removed), local `InnerA › InnerB` unchanged | Nested and Inner screens stay =1 |
| 7b | nested, `navigatorId` (v6/v7 only) | same, InnerB `btn-prune-id` | same as 7a | same as 7a |
| 8 | Reset demo | `btn-reset` from any screen | `Home` | Home=1 (counters cleared) |

Scenario 2: the Payment to Success transition first shows the unpruned stack, then prunes after the enter animation (`transitionEnd`, with a 500 ms fallback timer).

## Known issues

- v5 and v6 stay on Expo SDK 57: their `@react-navigation/stack` uses `InteractionManager`, which React Native 0.87+ removed (SDK 58 renders a "InteractionManager has been removed" error).
- v5 `@react-navigation/stack` peers on `@react-native-community/masked-view` (auto-installed by pnpm). It only matters for the float header, which the demo disables.
- v5 has no navigator ids, so the `navigatorId` button is hidden there.
- React Navigation v8 is not covered until its stable release.
- `react-native-screens` / `gesture-handler` versions come from `npx expo install --fix` for each app's SDK.

## Verification log

Run on the iOS Simulator (iPhone 17 Pro, iOS 26.0) with Argent driving Expo Go, 2026-11-16. Every scenario above was executed and each step asserted the `Stack:` / `Local:` readout and, for scenarios 1–4, the `Mounts (all)` line.

| App | Scenarios 1–7 | Notes |
| --- | --- | --- |
| v5 (SDK 57) | pass (94/94 steps) | `navigatorId` variant hidden (no ids in v5) |
| v6 (SDK 57) | pass (94/94 steps) | |
| v7 (SDK 58) | pass | all 7 scenarios, kept screens never remounted |
