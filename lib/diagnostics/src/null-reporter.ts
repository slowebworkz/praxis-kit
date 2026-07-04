import type { DiagnosticReporter } from './reporter'

export const nullReporter: DiagnosticReporter = {
  report() {},
}
