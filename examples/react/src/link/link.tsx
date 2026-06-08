import { createContractComponent } from '@praxis-kit/react'
import type { EmptyRecord } from '@praxis-kit/core'

export const Link = createContractComponent<'a', EmptyRecord, EmptyRecord>({
  tag: 'a',
  name: 'Link',
  styling: { base: 'text-blue-600 underline hover:text-blue-800' },
})
