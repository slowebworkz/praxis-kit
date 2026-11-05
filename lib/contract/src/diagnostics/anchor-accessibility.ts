import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import type { Severity as AriaSeverity } from '@praxis-kit/primitive'

// See `html.ts`'s `Fact` for why severity lives on the diagnostic rather than at each rule's call
// site. Facts only — no prose; see `aria.ts`.
type AccessibilityDiagnostic = DiagnosticInput & { readonly severity: AriaSeverity }

function createDiagnostic(code: DiagnosticCode): AccessibilityDiagnostic {
  return { code, category: DiagnosticCategory.Accessibility, severity: 'warning' }
}

// Accessibility best-practice advisories for <a>. These patterns are permitted by the HTML/ARIA
// specifications but are discouraged by the WAI-ARIA Authoring Practices because they weaken or
// obscure an anchor's navigation semantics. Distinct from `HtmlDiagnostics.anchor`, which covers
// HTML validity/security facts.
export const AnchorAccessibilityDiagnostics = {
  roleButtonWithHref(): AccessibilityDiagnostic {
    return createDiagnostic(DiagnosticCode.A11yAnchorRoleButtonWithHref)
  },

  ariaDisabledInert(): AccessibilityDiagnostic {
    return createDiagnostic(DiagnosticCode.A11yAnchorAriaDisabledInert)
  },
}
