import { createPolymorphicComponent } from '@polymorphic-ui/react'

export const Link = createPolymorphicComponent<'a', Record<never, never>, Record<never, never>>({
  tag: 'a',
  name: 'Link',
  styling: { base: 'text-blue-600 underline hover:text-blue-800' },
})
