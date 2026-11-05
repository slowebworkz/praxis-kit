import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import type { Severity as AriaSeverity } from '@praxis-kit/primitive'

// See `html.ts`'s `Fact` for why severity lives on the diagnostic rather than at each rule's call
// site. Facts only — no prose; see `aria.ts`.
type Fact = DiagnosticInput & { readonly severity: AriaSeverity }

function accessibilityFact(code: DiagnosticCode): Fact {
  return { code, category: DiagnosticCategory.Accessibility, severity: 'warning' }
}

// Best-practice advisories for `<input>`: legal per the HTML/ARIA spec, but near-certain UX
// mistakes. Distinct from `HtmlDiagnostics.input`, which covers HTML/ARIA spec validity facts.
export const InputAccessibilityDiagnostics = {
  missingAccessibleName(): Fact {
    return accessibilityFact(DiagnosticCode.A11yInputMissingAccessibleName)
  },

  placeholderIsNotLabel(): Fact {
    return accessibilityFact(DiagnosticCode.A11yInputPlaceholderNotLabel)
  },

  passwordMissingAutocomplete(): Fact {
    return accessibilityFact(DiagnosticCode.A11yInputPasswordAutocomplete)
  },

  requiredReadOnlyConflict(): Fact {
    return accessibilityFact(DiagnosticCode.A11yInputRequiredReadOnlyConflict)
  },
}
