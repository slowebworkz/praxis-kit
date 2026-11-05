import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'

// Facts only — see `aria.ts`. `messageId` separates entries that share a code.
function slot(
  code: DiagnosticCode,
  name: string,
  context: Readonly<Record<string, unknown>>,
  messageId?: string,
): DiagnosticInput {
  return {
    code,
    category: DiagnosticCategory.Contract,
    component: name,
    context: { name, ...context },
    ...(messageId !== undefined && { messageId }),
  }
}

export const SlotDiagnostics = {
  exclusive(name: string): DiagnosticInput {
    return slot(DiagnosticCode.SlotExclusive, name, {})
  },

  singleChildRequired(name: string, elementTerm: string): DiagnosticInput {
    return slot(DiagnosticCode.SlotSingleChild, name, { elementTerm }, 'SLOT1002.required')
  },

  singleChildExceeded(name: string, elementTerm: string, count: number): DiagnosticInput {
    return slot(DiagnosticCode.SlotSingleChild, name, { elementTerm, count }, 'SLOT1002.exceeded')
  },

  discardedChildren(name: string, elementTerm: string, count: number): DiagnosticInput {
    return slot(DiagnosticCode.SlotDiscardedChildren, name, { elementTerm, count })
  },

  renderFnRequired(name: string, received: string): DiagnosticInput {
    return slot(DiagnosticCode.SlotRenderFn, name, { received })
  },

  allowedAsMismatch(
    name: string,
    childTag: string,
    allowedAs: readonly unknown[],
  ): DiagnosticInput {
    return slot(DiagnosticCode.SlotAllowedAsMismatch, name, {
      childTag,
      allowedAs: allowedAs.map(String),
    })
  },
}
