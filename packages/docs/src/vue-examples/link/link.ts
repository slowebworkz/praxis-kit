import { createPolymorphicComponent } from '@polymorphic-ui/vue'
import type { EmptyRecord } from '@polymorphic-ui/core'

export const Link = createPolymorphicComponent<'a', EmptyRecord, EmptyRecord>({
  tag: 'a',
  name: 'Link',
  styling: { base: 'text-blue-600 underline hover:text-blue-800' },
})
