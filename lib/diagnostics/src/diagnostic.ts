import type { AnyRecord } from '@pk2/pipeline'
import type { DiagnosticCategory } from './category'
import type { DiagnosticCode } from './codes'
import type { SourceLocation } from './location'
import type { Severity } from './severity'
import type { DiagnosticSuggestion } from './suggestion'

type Context = AnyRecord
type Metadata = AnyRecord

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
