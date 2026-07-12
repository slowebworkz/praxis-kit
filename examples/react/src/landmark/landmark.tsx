import { createContractComponent } from 'praxis-kit/react'
import type { EmptyRecord } from '@praxis-kit/core'

export const Landmark = createContractComponent<'nav', EmptyRecord, EmptyRecord>({
  tag: 'nav',
  name: 'Landmark',
  styling: { base: 'block' },
  enforcement: { diagnostics: 'warn' },
})
