import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import type { ValidationViolation } from '../types'

// Every factory here returns a *fact*: the code, the category, and the `context` values a message
// would interpolate. None of them carries prose — the text for each code lives in a message catalog
// (see `praxis-kit-diagnostics`) that a `Diagnostics` instance resolves at report time. Without one,
// a formatter prints the code. Renaming a context key is a breaking change for every catalog.

function aria(code: DiagnosticCode, context?: Readonly<Record<string, unknown>>): DiagnosticInput {
  return {
    code,
    category: DiagnosticCategory.ARIA,
    ...(context !== undefined && { context }),
  }
}

// How an attribute value is shown in a message: `null`, `undefined`, a quoted string, or `String()`.
// A literal rendering of the value, not prose, so it stays here rather than in a catalog.
function showValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  return typeof value === 'string' ? `"${value}"` : String(value)
}

export const AriaDiagnostics = {
  /**
   * Generic bridge for violations produced by external AriaRule functions. The rule author wrote
   * `v.message` themselves, so it is carried through as-is rather than looked up in a catalog.
   */
  fromViolation(v: ValidationViolation): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaViolation,
      category: DiagnosticCategory.ARIA,
      message: v.message,
    }
  },

  attributeInvalid(key: string, role: string): DiagnosticInput {
    return aria(DiagnosticCode.AriaAttributeInvalid, { key, role })
  },

  missingLiveRegion(role: string, impliedLive: string): DiagnosticInput {
    return aria(DiagnosticCode.AriaMissingLiveRegion, { role, impliedLive })
  },

  missingAtomic(role: string): DiagnosticInput {
    return aria(DiagnosticCode.AriaMissingAtomic, { role })
  },

  relevantInvalidTokens(invalid: string[]): DiagnosticInput {
    return aria(DiagnosticCode.AriaRelevantInvalidToken, { invalid })
  },

  relevantSuperseded(): DiagnosticInput {
    return aria(DiagnosticCode.AriaRelevantSuperseded)
  },

  missingAccessibleName(tag: string): DiagnosticInput {
    return aria(DiagnosticCode.AriaMissingAccessibleName, { tag })
  },

  nameProhibited(attr: string, role: string): DiagnosticInput {
    return aria(DiagnosticCode.AriaNameProhibited, { attr, role })
  },

  attributeOnPresentational(attr: string, tag: string): DiagnosticInput {
    return aria(DiagnosticCode.AriaAttributeOnPresentational, { attr, tag })
  },

  ariaHiddenOnFocusable(tag: string): DiagnosticInput {
    return aria(DiagnosticCode.AriaHiddenOnFocusable, { tag })
  },

  invalidAttributeValue(attr: string, value: unknown, expected: string): DiagnosticInput {
    return aria(DiagnosticCode.AriaInvalidAttributeValue, { attr, got: showValue(value), expected })
  },

  redundantAriaLevel(tag: string, level: number): DiagnosticInput {
    return aria(DiagnosticCode.AriaRedundantLevelAttribute, { tag, level })
  },

  requiredProperty(attr: string, role: string): DiagnosticInput {
    return aria(DiagnosticCode.AriaRequiredProperty, { attr, role })
  },

  invalidRole(role: string | undefined, tag: string): DiagnosticInput {
    return aria(DiagnosticCode.AriaInvalidRole, { role: role ?? '', tag })
  },
}
