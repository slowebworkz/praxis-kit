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

  attributeOnPresentational(attr: string, tag: string): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaAttributeOnPresentational,
      category: DiagnosticCategory.ARIA,
      message: `"${attr}" is not allowed on a presentational <${tag}>. Presentational elements are invisible to assistive technology.`,
      rationale:
        'role="none" and role="presentation" (including <img alt="">) remove an element from the accessibility tree. ARIA attributes on such elements are ignored by assistive technology.',
      suggestions: [
        {
          title: 'Remove the attribute',
          description: `"${attr}" has no effect when the element has role="none" or role="presentation".`,
        },
      ],
    }
  },

  ariaHiddenOnFocusable(tag: string): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaHiddenOnFocusable,
      category: DiagnosticCategory.ARIA,
      message: `aria-hidden="true" must not be used on focusable <${tag}> elements. Screen reader users who navigate by keyboard will encounter the element but receive no information about it.`,
      rationale:
        'aria-hidden removes an element from the accessibility tree while leaving it keyboard-reachable. ' +
        'This creates a "ghost" — a focusable element assistive technology cannot describe.',
      suggestions: [
        {
          title: 'Remove aria-hidden',
          description:
            'If the element should be hidden from all users, use the HTML hidden attribute or CSS display:none instead.',
        },
        {
          title: 'Make the element non-focusable',
          description:
            'If the element is intentionally decorative, add tabindex="-1" and disable it so it is not reachable by keyboard.',
        },
      ],
    }
  },

  invalidAttributeValue(attr: string, value: unknown, expected: string): DiagnosticInput {
    const got =
      value === null
        ? 'null'
        : value === undefined
          ? 'undefined'
          : typeof value === 'string'
            ? `"${value}"`
            : String(value)
    return {
      code: DiagnosticCode.AriaInvalidAttributeValue,
      category: DiagnosticCategory.ARIA,
      message: `"${attr}" has an invalid value (${got}). Expected: ${expected}.`,
      rationale:
        'ARIA attributes with invalid values are silently ignored by assistive technology, making the markup semantically inert.',
      suggestions: [
        {
          title: `Use a valid value for ${attr}`,
          description: `Valid values are: ${expected}.`,
        },
      ],
    }
  },

  redundantAriaLevel(tag: string, level: number): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaRedundantLevelAttribute,
      category: DiagnosticCategory.ARIA,
      message: `aria-level="${level}" is redundant on <${tag}>: the element already has an implicit heading level of ${level}. Remove the attribute.`,
      rationale:
        'Restating the implicit aria-level adds noise without semantic value. ' +
        'Use aria-level only to override the native heading level (e.g. aria-level="3" on <h2>).',
      suggestions: [
        {
          title: 'Remove aria-level',
          description: `<${tag}> already implies aria-level="${level}".`,
        },
      ],
    }
  },

  requiredProperty(attr: string, role: string): DiagnosticInput {
    return {
      code: DiagnosticCode.AriaRequiredProperty,
      category: DiagnosticCategory.ARIA,
      message: `"${attr}" is required for role="${role}" but is missing.`,
      rationale:
        `WAI-ARIA 1.2 specifies required states and properties for certain roles. ` +
        `Without "${attr}", assistive technology cannot correctly communicate the element's state to users.`,
      suggestions: [
        {
          title: `Add ${attr}`,
          description: `role="${role}" requires "${attr}" to be present.`,
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
