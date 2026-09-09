import { silentDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from './create-contract-component'

export const Button = createContractComponent({
  tag: 'button' as const,
  name: 'Button',
  defaults: { type: 'button' as const },
  styling: { base: 'btn' },
})

export const AlertRegion = createContractComponent({
  tag: 'div' as const,
  name: 'AlertRegion',
  enforcement: { diagnostics: silentDiagnostics },
})
