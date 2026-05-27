import { createContractComponent } from '@polymorphic-ui/vue'
import type { EmptyRecord } from '@polymorphic-ui/core'

export const Landmark = createContractComponent<'nav', EmptyRecord, EmptyRecord>({
  tag: 'nav',
  name: 'Landmark',
  styling: { base: 'block' },
  enforcement: { strict: 'warn' },
})
