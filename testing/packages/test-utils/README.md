# @praxis-kit/test-utils

Small Vitest helpers shared by the other testing packages: `expectContains` (has/lacks assertions
over a string or a token list) and `withWarnSpy` (silence `console.warn` and always restore it).

Deliberately free of praxis-kit dependencies — a helper that needs framework or contract types
belongs in the testing package that owns them. Add to this package only when a second testing
package would otherwise copy a helper.

Private and source-exporting; consumed by `testing/packages/*` as a `dependency` (their source is
test-only, so the one-way rule still holds). Requires `vitest` as a peer dependency. See
[`../../README.md`](../../README.md) for the workspace rules.
