# @praxis-kit/test-utils

Small helpers shared by the other testing packages and adapter tests: `expectContains` (has/lacks
assertions over a string or a token list), `withWarnSpy` (silence `console.warn` and always restore
it) and `definedProp` (spread an optional prop under `exactOptionalPropertyTypes`).

Deliberately free of praxis-kit dependencies — a helper that needs framework or contract types
belongs in the testing package that owns them. Add to this package only when a second testing
package would otherwise copy a helper.

Private and source-exporting; consumed by `testing/packages/*` as a `dependency` (their source is
test-only, so the one-way rule still holds). Requires `vitest` as a peer dependency. See
[`../../README.md`](../../README.md) for the workspace rules.
