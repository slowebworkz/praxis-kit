import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import type { ValidationViolation } from '../types'

export const AriaDiagnostics = {
  /** Generic bridge for violations produced by external AriaRule functions. */
  fromViolation(v: ValidationViolation): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaViolation,
      category: DiagnosticCategory.ARIA,
      message: v.message,
    }
  },

  attributeInvalid(key: string, role: string): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaAttributeInvalid,
      category: DiagnosticCategory.ARIA,
      message: `"${key}" is not valid on role="${role}". It will be removed.`,
      rationale:
        'Invalid ARIA attributes are ignored by assistive technology and may trigger accessibility-tree warnings in browser devtools.',
      suggestions: [
        {
          title: 'Remove the attribute',
          description: `"${key}" is not in the allowed attribute set for role="${role}".`,
        },
      ],
    }
  },

  missingLiveRegion(role: string, impliedLive: string): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaMissingLiveRegion,
      category: DiagnosticCategory.ARIA,
      message: `role="${role}" implies aria-live="${impliedLive}" but it is missing. It has been injected.`,
      rationale:
        'Live-region roles announce dynamic content changes to screen readers. Without aria-live the politeness level is unspecified and announcements may be silent.',
      suggestions: [
        {
          title: `Add aria-live="${impliedLive}"`,
          description: `role="${role}" conventionally implies aria-live="${impliedLive}".`,
          fix: `aria-live="${impliedLive}"`,
        },
      ],
    }
  },

  missingAtomic(role: string): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaMissingAtomic,
      category: DiagnosticCategory.ARIA,
      message: `role="${role}" is a live region. Consider setting aria-atomic="true" if the full region should be announced as a unit, or aria-atomic="false" if only changed nodes should be read.`,
      rationale:
        'aria-atomic controls whether assistive technology announces the entire live region or only the changed nodes. Omitting it leaves the behaviour browser-defined.',
    }
  },

  relevantInvalidTokens(invalid: string[]): DiagnosticInput {
    const quoted = invalid.map((t) => `"${t}"`).join(', ')
    return {
      code: DiagnosticCode.AriaRelevantInvalidToken,
      category: DiagnosticCategory.ARIA,
      message: `aria-relevant contains invalid token(s): ${quoted}. Valid tokens are: additions, removals, text, all.`,
      rationale:
        'aria-relevant accepts a space-separated list of change types. Unrecognised tokens are silently ignored by assistive technology, making the attribute ineffective.',
      suggestions: [
        {
          title: 'Use only valid tokens',
          description:
            'Valid values are: additions, removals, text, all (or a space-separated combination).',
        },
      ],
    }
  },

  relevantSuperseded(): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaRelevantSuperseded,
      category: DiagnosticCategory.ARIA,
      message:
        'aria-relevant includes "all" alongside other tokens. "all" supersedes additions, removals, and text — use aria-relevant="all" alone.',
      rationale:
        '"all" is equivalent to "additions removals text". Combining it with other tokens is redundant and may confuse readers of the markup.',
      suggestions: [
        {
          title: 'Use aria-relevant="all"',
          fix: 'aria-relevant="all"',
        },
      ],
    }
  },

  missingAccessibleName(tag: string): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaMissingAccessibleName,
      category: DiagnosticCategory.ARIA,
      message: `<${tag}> has no accessible name. Add aria-label or aria-labelledby.`,
      rationale:
        'Elements with a landmark or interactive role must have an accessible name so that ' +
        'assistive technology can identify them when presenting the page outline.',
      suggestions: [
        {
          title: 'Add aria-label',
          description: `Add aria-label="…" directly to the <${tag}> element.`,
        },
        {
          title: 'Add aria-labelledby',
          description: 'Point aria-labelledby at the id of an existing heading or label element.',
        },
      ],
    }
  },

  invalidRole(role: string | undefined, tag: string): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaInvalidRole,
      category: DiagnosticCategory.ARIA,
      message: `Invalid role "${role ?? ''}" on <${tag}>.`,
      rationale:
        'An unrecognised or misapplied ARIA role is ignored by assistive technology and may degrade the accessibility of the element.',
    }
  },
}
