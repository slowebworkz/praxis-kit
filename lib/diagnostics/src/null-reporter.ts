import type { DiagnosticReporter } from './types'

export const nullReporter: DiagnosticReporter = {
  report() {},
}
