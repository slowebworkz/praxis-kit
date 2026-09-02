# @praxis-kit/diagnostics

Diagnostic policy engine — severity levels, stable diagnostic codes, pluggable reporters, and
structured error collection.

**Target architecture:** the shared channel through which the contract engine, styling pipeline,
adapters, and build plugins report violations. Not all of those exist or route through it yet —
notably `lib/pipeline` keeps its own minimal `Diagnostic` shape and takes no dependency here (it is
a generic executor; it should not know about praxis severity/category taxonomy). Layers adopt this
package as they land.

Private workspace package, bundled into whichever `praxis-kit` entries need it. The `Diagnostics`
class is meant to keep a single nominal identity across entry points once the published package
exists — construction stays internal, the _type_ is re-exported where callers need to name it.

> Ported from `../pk` mostly verbatim. Adaptations: the old single `types.ts` was promoted to a
> `types/` folder + barrel (repo default — see `DECISIONS.md`); `ThrowingReporter` was removed
> (dead — the policy owns throwing); `debug()` / `fatal()` added for severity-facade symmetry;
> `active` renamed `warnActive`; `DefaultPolicy` now validates its thresholds.

---

## Core pieces

| Export                                                                                              | Purpose                                                              |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `Diagnostics`                                                                     | Facade: `debug`/`info`/`warn`/`error`/`fatal` stamp severity, route via policy |
| `Severity`, `isAtLeast`                                                           | Severity scale and comparisons                                       |
| `DiagnosticCode`, `DiagnosticCategory`                                            | Stable codes and categories for every diagnostic                     |
| `DefaultPolicy`, `Enforcement`                                                    | Policy: which severities are ignored, reported, or throw             |
| `ConsoleReporter`, `AsyncConsoleReporter`, `CollectingReporter`, `nullReporter`   | Reporter implementations                                             |
| `PraxisError`                                                                     | Structured error type carrying a diagnostic                          |
| `ok` / `err`, `Result`, `ValidationResult`                                        | Result helpers for validation flows                                  |
| `formatDiagnostic`, `Formatter`                                                   | Message formatting                                                   |
| `silentDiagnostics` / `warnDiagnostics` / `throwDiagnostics`, `resolveDiagnostics`| Ready-made presets + name→instance resolver                          |
| `SourceLocation`, `DiagnosticSuggestion`                                          | Location + fix-suggestion metadata                                   |

## Design notes

- **The policy owns enforcement; reporters only report.** `Diagnostics.report` consults the policy
  first — `Ignore` drops the diagnostic, `Throw` raises a `PraxisError` then and there, and only
  `Report` reaches the reporter. So a reporter never decides to throw (there is no
  `ThrowingReporter`), and "strict mode" is just a policy with `throwThreshold: Severity.Error`
  (`throwDiagnostics`).
- Reporters are injected; nothing in this package touches `console` unless a console reporter is
  chosen. Tests use `CollectingReporter`.
- `AsyncConsoleReporter` dedups on the **formatted string** within a microtask flush — a console-UX
  choice, not a lossless channel. Use `CollectingReporter` when every distinct diagnostic matters.
- `Diagnostics.warnActive` is a cheap gate: `false` ⇒ a `Warning` would be ignored, so skip
  warning-level validation work. Scoped to Warning — not a general "diagnostics on" flag.
- `DefaultPolicy` requires `throwThreshold >= reportThreshold` (throws `RangeError` otherwise) — a
  throw band below the report band is always a misconfiguration.
- `DiagnosticInput` is the write-side shape (`Diagnostic` minus `severity`). Planned direction:
  grow structured `context` fields so formatters derive messages instead of callers pre-formatting
  them — do not add fields without a concrete consumer.
- `context`/`metadata` are typed via `@praxis-kit/primitive`'s `AnyRecord`. `primitive` also
  imports the `Diagnostics` type from here — a **type-only** package cycle, erased at build, that
  is accepted to keep one source of truth for the primitive types (see `DECISIONS.md`).

Development: `pnpm --filter @praxis-kit/diagnostics test`, `pnpm --filter @praxis-kit/diagnostics typecheck`.
