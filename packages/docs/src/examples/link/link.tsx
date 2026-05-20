import { createPolymorphicComponent } from '@polymorphic-ui/react'

export const Link = createPolymorphicComponent<'a', Record<never, never>, Record<never, never>>({
  defaultTag: 'a',
  displayName: 'Link',
  baseClassName: 'text-blue-600 underline hover:text-blue-800',
})
