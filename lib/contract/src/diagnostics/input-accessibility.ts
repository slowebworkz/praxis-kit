import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import type { Severity as AriaSeverity } from '@praxis-kit/primitive'

// See `html.ts`'s `Fact` for why severity lives on the diagnostic rather than at each rule's call
// site.
type Fact = DiagnosticInput & { readonly severity: AriaSeverity }

function accessibilityFact(input: Omit<Fact, 'category'>): Fact {
  return { category: DiagnosticCategory.Accessibility, ...input }
}

// Best-practice advisories for `<input>`: legal per the HTML/ARIA spec, but near-certain UX
// mistakes. Distinct from `HtmlDiagnostics.input`, which covers HTML/ARIA spec validity facts.
export const InputAccessibilityDiagnostics = {
  missingAccessibleName(): Fact {
    return accessibilityFact({
      code: DiagnosticCode.A11yInputMissingAccessibleName,
      severity: 'warning',
      message:
        'This input has no accessible name. Add an associated <label>, aria-label, or aria-labelledby.',
      rationale:
        'Assistive technology announces a form field by its accessible name; without one, users of screen readers cannot tell what the field is for.',
      suggestions: [
        { title: 'Add aria-label', description: 'Set aria-label="…" directly on the input.' },
        {
          title: 'Add an associated <label>',
          description: 'Wrap the input in a <label>, or point a <label for="…"> at its id.',
        },
      ],
    })
  },

  placeholderIsNotLabel(): Fact {
    return accessibilityFact({
      code: DiagnosticCode.A11yInputPlaceholderNotLabel,
      severity: 'warning',
      message:
        'Placeholder text does not provide an accessible name. Add an associated <label>, aria-label, or aria-labelledby.',
      rationale:
        "Placeholder text disappears as users interact with the field and is not treated as the control's accessible name by many assistive technologies.",
      suggestions: [
        { title: 'Add aria-label', description: 'Set aria-label="…" directly on the input.' },
        {
          title: 'Add an associated <label>',
          description: 'Wrap the input in a <label>, or point a <label for="…"> at its id.',
        },
      ],
    })
  },

  passwordMissingAutocomplete(): Fact {
    return accessibilityFact({
      code: DiagnosticCode.A11yInputPasswordAutocomplete,
      severity: 'warning',
      message: 'Password inputs should specify an autoComplete value.',
      rationale:
        'Without an explicit autocomplete hint, password managers and browsers cannot reliably tell a sign-in field apart from a password-creation field.',
      suggestions: [
        {
          title: 'Set autoComplete="current-password"',
          description: 'Use this for sign-in forms.',
        },
        {
          title: 'Set autoComplete="new-password"',
          description: 'Use this for sign-up / change-password forms.',
        },
      ],
    })
  },

  requiredReadOnlyConflict(): Fact {
    return accessibilityFact({
      code: DiagnosticCode.A11yInputRequiredReadOnlyConflict,
      severity: 'warning',
      message:
        'The required and readOnly attributes are both present. A read-only field cannot satisfy required validation through user interaction.',
      rationale:
        'This combination is valid HTML but usually indicates an unintended state. Consider using disabled instead of readOnly, or only applying required when the field is editable.',
    })
  },
}
