/** The kind of rule a diagnostic reports. The load-bearing distinction:
 *
 *  - `HTML` / `ARIA` — **spec compliance**. The markup or ARIA usage is invalid
 *    per the HTML standard or the ARIA spec. A fact, not a judgement.
 *  - `Accessibility` — **best-practice guidance**. The usage is spec-valid but
 *    inadvisable (e.g. a placeholder standing in for a label). Advisory.
 *
 *  Keep that split deliberate: a rule belongs in `Accessibility` only when it is
 *  *not* an `HTML`/`ARIA` validity fact. The code ranges mirror it — `ARIA2xxx`
 *  and `HTML3xxx` are validity, `A11Y8xxx` is guidance (see `codes.ts`). */
export enum DiagnosticCategory {
  Contract,
  HTML,
  ARIA,
  Composition,
  Rendering,
  Accessibility,
  Performance,
  Internal,
  Deprecation,
  Lint,
}
