# @praxis-kit/diagnostics

Diagnostic policy engine — severity levels, stable diagnostic codes, pluggable reporters, and
structured error collection. This is the single channel through which every praxis-kit layer
(contract engine, styling pipeline, adapters, build plugins) reports violations.

Private workspace. In the published package it is built **once** into an internal shared chunk
(`dist/_shared/diagnostics.*` of `praxis-kit`) so that the `Diagnostics` class keeps a single
nominal identity across all entry points — see `packages/kit/scripts/postbuild.mjs`. The
`Diagnostics` _type_ is publicly nameable via `praxis-kit/contract`; construction is internal.

---

## Core pieces

| Export                                                                                              | Purpose                                                              |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `Diagnostics`                                                                                       | Facade: collects `DiagnosticInput`s, routes via policy to a reporter |
| `Severity`, `isAtLeast`                                                                             | Severity scale and comparisons                                       |
| `DiagnosticCode`, `DiagnosticCategory`                                                              | Stable codes and categories for every diagnostic                     |
| `DefaultPolicy`, `Enforcement`                                                                      | Policy: which severities warn, throw, or stay silent                 |
| `ConsoleReporter`, `AsyncConsoleReporter`, `CollectingReporter`, `NullReporter`, `ThrowingReporter` | Reporter implementations                                             |
| `PraxisError`                                                                                       | Structured error type carrying a diagnostic                          |
| `ok` / `err`, `Result`, `ValidationResult`                                                          | Result helpers for validation flows                                  |
| `formatDiagnostic`, `Formatter`                                                                     | Message formatting                                                   |
| `SourceLocation`, `DiagnosticSuggestion`                                                            | Location + fix-suggestion metadata                                   |

## Design notes

- Reporters are injected; nothing in this package touches `console` unless a console reporter is
  chosen. Tests use `CollectingReporter`; strict mode maps to `ThrowingReporter` behavior.
- `DiagnosticInput` is the write-side shape. Planned direction: grow structured context fields so
  formatters derive messages instead of callers pre-formatting them (do not add fields without a
  concrete consumer).

Development: `pnpm --filter @praxis-kit/diagnostics test`, `typecheck`, `lint`.
