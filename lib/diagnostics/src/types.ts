import type { AnyRecord } from '@praxis-kit/pipeline'
import type { DiagnosticCategory } from './category'
import type { DiagnosticCode } from './codes'
import type { Severity } from './severity'

type Context = AnyRecord
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

  context?: Context
  metadata?: Metadata
}

export interface DiagnosticReporter {
  report(diagnostic: Diagnostic): void
}
