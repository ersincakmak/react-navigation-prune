# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability** (private vulnerability reporting). You will get a reply within a few days. Once a fix is released, the advisory is published with credit to the reporter unless you prefer otherwise.

## Scope

`react-navigation-prune` has zero runtime dependencies and only manipulates React Navigation state in memory. It makes no network requests and stores nothing. Issues in React Navigation, React or React Native should be reported to those projects.

## Known advisories in development dependencies

The published package has no dependencies, so the advisories below never reach users. They affect only this repository's test suite and example apps:

- **`decode-uri-component` < 0.5.1** (DoS on malformed percent-encoding), pulled in by `@react-navigation/core` v5/v6 through `query-string` 6/7. The fixed versions are ESM-only and break `query-string` (`decodeComponent is not a function`), so they cannot be forced. The tests and demos never decode untrusted URLs; the alerts are dismissed as tolerable risk.
- **`minimatch` < 11.0.1** (DoS in Expo tooling of the example apps) is overridden to `^11.0.1` in each example's `pnpm-workspace.yaml`.
