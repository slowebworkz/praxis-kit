// lib/diagnostics sits below @praxis-kit/guards in the dependency graph (guards depends on
// primitive, primitive depends on diagnostics for the Diagnostics type) — importing guards here
// would cycle, so this is the one place in the workspace that imports guardz directly rather than
// through @praxis-kit/guards. See DECISIONS.md.
import { isDefined } from 'guardz'
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
