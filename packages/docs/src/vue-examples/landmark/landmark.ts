import { createPolymorphicComponent } from '@polymorphic-ui/vue'

export const Landmark = createPolymorphicComponent<
  'nav',
  Record<never, never>,
  Record<never, never>
>({
  defaultTag: 'nav',
  displayName: 'Landmark',
  baseClassName: 'block',
  strict: 'warn',
})
