import { createContractComponent } from '@polymorphic-ui/react'
import type { EmptyRecord } from '@polymorphic-ui/core'

export const Landmark = createContractComponent<'nav', EmptyRecord, EmptyRecord>({
  tag: 'nav',
  name: 'Landmark',
  styling: { base: 'block' },
  enforcement: { strict: 'warn' },
})
