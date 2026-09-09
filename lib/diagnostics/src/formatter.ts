import { isDefined } from '@praxis-kit/foundation'
import type { Diagnostic } from './types'
import { DiagnosticCategory } from './category'
import { Severity } from './severity'

export type Formatter = (diagnostic: Diagnostic) => string

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const level = Severity[diagnostic.severity]
  const category = DiagnosticCategory[diagnostic.category]
  const prefix = isDefined(category) ? `[${category}] ` : ''
  return `${level} ${diagnostic.code}: ${prefix}${diagnostic.message}`
}
