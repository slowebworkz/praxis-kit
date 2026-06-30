/**
 * Claim: a component with ARIA enforcement retains AriaPolicyEngine.
 * No Tailwind pipeline, no other framework adapter should appear.
 */
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createAriaEnforcedComponent } from '@praxis-kit/react'
import type { AriaRule } from '@praxis-kit/core/contract'

const requireAriaLabel: AriaRule = ({ props }) =>
  'aria-label' in props || 'aria-labelledby' in props
    ? [{ valid: true }]
    : [{ valid: false, severity: 'warning', fixable: false, message: 'Missing accessible label' }]

export const Button = createAriaEnforcedComponent({
  tag: 'button',
  name: 'Button',
  enforcement: {
    diagnostics: warnDiagnostics,
    aria: [requireAriaLabel],
  },
})
