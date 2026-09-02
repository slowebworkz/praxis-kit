import type { DiagnosticCategory } from '../category'
import type { DiagnosticCode } from '../codes'
import type { Severity } from '../severity'
// `AnyRecord`/`StringMap` are the single source of truth in `@praxis-kit/primitive`.
// `primitive` also imports the `Diagnostics` type from here, so this is a package
// cycle — but a type-only one, erased at build time. Accepted rather than
// duplicating the primitives. See DECISIONS.md.
import type { AnyRecord } from '@praxis-kit/primitive'

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

  message: string
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
