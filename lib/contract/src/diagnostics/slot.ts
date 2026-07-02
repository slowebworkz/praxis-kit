import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'

export const SlotDiagnostics = {
  exclusive(name: string): DiagnosticInput {
    return {
      code: DiagnosticCode.SlotExclusive,
      category: DiagnosticCategory.Contract,
      component: name,
      message: `${name}: "as" and "asChild" are mutually exclusive`,
    }
  },

  singleChildRequired(name: string, elementTerm: string): DiagnosticInput {
    return {
      code: DiagnosticCode.SlotSingleChild,
      category: DiagnosticCategory.Contract,
      component: name,
      message: `${name}: asChild requires a ${elementTerm} child`,
    }
  },

  singleChildExceeded(name: string, elementTerm: string, count: number): DiagnosticInput {
    return {
      code: DiagnosticCode.SlotSingleChild,
      category: DiagnosticCategory.Contract,
      component: name,
      message: `${name}: asChild requires exactly one ${elementTerm} child, got ${count}`,
    }
  },

  discardedChildren(name: string, elementTerm: string, count: number): DiagnosticInput {
    const suffix = count === 1 ? '' : 'ren'
    return {
      code: DiagnosticCode.SlotDiscardedChildren,
      category: DiagnosticCategory.Contract,
      component: name,
      message:
        `${name}: asChild discarded ${count} non-element child${suffix} — ` +
        `only ${elementTerm}s are valid asChild children.`,
    }
  },

  renderFnRequired(name: string, received: string): DiagnosticInput {
    return {
      code: DiagnosticCode.SlotRenderFn,
      category: DiagnosticCategory.Contract,
      component: name,
      message: `${name}: asChild requires a render function as children, got ${received}`,
    }
  },
}
