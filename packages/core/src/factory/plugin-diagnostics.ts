import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'

export const PluginDiagnostics = {
  invalidShape(received: unknown): DiagnosticInput {
    const got = received === null ? 'null' : typeof received
    return {
      code: DiagnosticCode.PluginInvalidShape,
      category: DiagnosticCategory.Internal,
      message: `[praxis-kit] Plugin factory must return an object with a 'pipeline' function. Got: ${got}.`,
    }
  },

  pipelineReturnType(received: unknown): DiagnosticInput {
    const got = received === null ? 'null' : Array.isArray(received) ? 'array' : typeof received
    return {
      code: DiagnosticCode.PluginPipelineReturnType,
      category: DiagnosticCategory.Internal,
      message: `[praxis-kit] Plugin pipeline must return a string. Got: ${got}.`,
    }
  },
}
