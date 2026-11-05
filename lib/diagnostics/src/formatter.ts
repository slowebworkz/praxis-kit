// Guards come from ./guards, not @praxis-kit/guards: that package sits above this one.
import { isDefined, isUndefined } from './guards'
import type { Diagnostic } from './types'
import { DiagnosticCategory } from './category'
import { Severity } from './severity'

export type Formatter = (diagnostic: Diagnostic) => string

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const level = Severity[diagnostic.severity]
  // No text to show: the code alone identifies the diagnostic (and is what a resolver or the docs
  // key off). Context is for a resolver to interpolate, never an ad hoc message.
  if (isUndefined(diagnostic.message)) return `${level} ${diagnostic.code}`
  const category = DiagnosticCategory[diagnostic.category]
  const prefix = isDefined(category) ? `[${category}] ` : ''
  return `${level} ${diagnostic.code}: ${prefix}${diagnostic.message}`
}
