import type { DiagnosticInput } from '@praxis-kit/diagnostics'

/**
 * The text to show for a diagnostic fact before (or without) a message resolver: its own message if
 * it carries one, otherwise its code. Praxis Kit emits facts, so for most diagnostics this is the
 * code; a `Diagnostics` instance configured with a resolver attaches real text when it reports.
 */
export function factText(diagnostic: Pick<DiagnosticInput, 'message' | 'code'>): string {
  return diagnostic.message ?? diagnostic.code
}
