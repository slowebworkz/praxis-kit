import { defineComponent, h, Fragment } from 'vue'

export type SlottableProps = { children?: unknown }

/**
 * Marker component for the Slottable sibling pattern. Wrap content that should
 * be passed as the asChild slot's children when additional siblings are present.
 */
export const Slottable = defineComponent({
  name: 'Slottable',
  setup(_, { slots }) {
    return () => h(Fragment, null, slots.default?.())
  },
})
