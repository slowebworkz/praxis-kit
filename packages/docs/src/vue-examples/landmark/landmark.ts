import { createPolymorphicComponent } from '@polymorphic-ui/vue'

export const Landmark = createPolymorphicComponent<
  'nav',
  Record<never, never>,
  Record<never, never>
>({
  tag: 'nav',
  name: 'Landmark',
  styling: { base: 'block' },
  enforcement: { strict: 'warn' },
})
