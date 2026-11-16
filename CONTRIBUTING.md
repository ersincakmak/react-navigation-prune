# Contributing

Thanks for your interest in improving `react-navigation-prune`.

## Workflow

- `main` is protected: every change goes through a pull request, and CI (typecheck, tests on Node 20, 22 and 24, package contents) must pass before it can be merged. Pull requests are squash-merged.
- Keep changes focused. Add a test for every behaviour change and a type test (`test/types/core-vN.ts`) for every typing change.
- Update `CHANGELOG.md` under `[Unreleased]`.

## Setup

This repository uses pnpm (pinned via `packageManager`; enable it with `corepack enable`).

```sh
pnpm install
pnpm typecheck
pnpm test
```

The example apps under `example/` are standalone Expo projects; see `example/README.md`.

## Rules

- No runtime dependencies, and no imports from `@react-navigation/*` in `src/`.
- Never mutate navigation state; return the same reference when nothing changes.

## Security

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
