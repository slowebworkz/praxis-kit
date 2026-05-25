import { createPolymorphicComponent } from '@polymorphic-ui/react'
import type { EmptyRecord } from '@polymorphic-ui/core'

export const Landmark = createPolymorphicComponent<'nav', EmptyRecord, EmptyRecord>({
  tag: 'nav',
  name: 'Landmark',
  styling: { base: 'block' },
  enforcement: { strict: 'warn' },
})
