import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'

export const ViteDiagnostics = {
  cardinalityViolation(
    name: string,
    totalMin: number,
    totalMax: number,
    receivedMin: number,
    receivedMax: number,
  ): DiagnosticInput {
    const rangeText =
      totalMax === Infinity
        ? `at least ${totalMin}`
        : totalMin === totalMax
          ? `exactly ${totalMin}`
          : `${totalMin}–${totalMax}`
    const childWord = totalMax === 1 && totalMin === 1 ? 'child' : 'children'
    const receivedText =
      receivedMin === receivedMax ? `${receivedMin}` : `${receivedMin}–${receivedMax}`
    return {
      code: DiagnosticCode.LintCardinalityViolation,
      category: DiagnosticCategory.Lint,
      message: `<${name}> expects ${rangeText} ${childWord} but received ${receivedText}.`,
    }
  },

  ariaTagOverride(tagName: string, asValue: string, defaultTag: string): DiagnosticInput {
    return {
      code: DiagnosticCode.LintAriaTagOverride,
      category: DiagnosticCategory.Lint,
      message: `<${tagName} as="${asValue}"> changes the element type from '${defaultTag}' — ARIA enforcement rules may not apply as expected.`,
    }
  },
}
