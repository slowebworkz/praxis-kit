import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import type { ValidationViolation } from '../types'

export const AriaDiagnostics = {
  fromViolation(v: ValidationViolation): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaViolation,
      category: DiagnosticCategory.ARIA,
      message: v.message,
    }
  },
}
