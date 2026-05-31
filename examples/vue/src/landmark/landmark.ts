import { createContractComponent } from '@praxis-ui/vue'
import type { EmptyRecord } from '@praxis-ui/core'

export const Landmark = createContractComponent<'nav', EmptyRecord, EmptyRecord>({
  tag: 'nav',
  name: 'Landmark',
  styling: { base: 'block' },
  enforcement: { strict: 'warn' },
})
