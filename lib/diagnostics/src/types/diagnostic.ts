import type { DiagnosticCategory } from '../category'
import type { DiagnosticCode } from '../codes'
import type { Severity } from '../severity'
// `AnyRecord`/`StringMap` originate in `@praxis-kit/foundation` (re-exported by
// `@praxis-kit/primitive`). Import them from `foundation` directly: `primitive`
// imports the `Diagnostics` type from here, so going through `primitive` would
// form a package cycle (`diagnostics → primitive → diagnostics`). `foundation`
// is a leaf, so `diagnostics → foundation` is acyclic.
import type { AnyRecord } from '@praxis-kit/foundation'

/** Data a *reader* needs to understand this diagnostic — the values a formatter
 *  would interpolate into `rationale`/`message` (the offending prop name, the
 *  expected vs actual child, the ARIA token). Human-oriented. */
type Context = AnyRecord

/** Data a *consumer* (build plugin, editor integration, telemetry) keys off —
 *  never rendered to a person. Machine-oriented. Keep the split with `Context`
 *  deliberate: without it, both degrade into interchangeable dumping grounds. */
type Metadata = AnyRecord

export interface SourcePosition {
  line: number
  col: number
}

export interface SourceLocation {
  file: string
  start: SourcePosition
  end?: SourcePosition
}

export interface DiagnosticSuggestion {
  title: string
  description?: string
  fix?: string
}

export interface Diagnostic {
  code: DiagnosticCode
  severity: Severity
  category: DiagnosticCategory

  /** Human-readable text. Optional: the core emits facts (code, severity, category, context) and
   *  carries no prose. A message is attached by a `MessageResolver` on the `Diagnostics` instance
   *  when one is configured; without one, formatters fall back to `code`. */
  message?: string
  /** Names the catalog entry that describes this diagnostic when it differs from `code` (several
   *  codes can share one entry). A fact, not text. */
  messageId?: string
  rationale?: string

  component?: string
  contract?: string

  location?: SourceLocation

  suggestions?: DiagnosticSuggestion[]

  /** Values a formatter interpolates into the message — human-oriented. */
  context?: Context
  /** Structured data for tooling — never rendered. Machine-oriented. */
  metadata?: Metadata
}

/** The text parts a resolver may supply for a diagnostic. */
export interface DiagnosticText {
  message?: string
  rationale?: string
  suggestions?: DiagnosticSuggestion[]
}

/**
 * Turns a diagnostic's facts (`code`, `messageId`, `context`) into text. Supplied per `Diagnostics`
 * instance, never globally, so concurrent consumers can use different locales safely. Return
 * `undefined` for a diagnostic it has no text for; the formatter then falls back to the code.
 */
export type MessageResolver = (diagnostic: Diagnostic) => DiagnosticText | undefined
