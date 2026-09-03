<script lang="ts">
import { defineComponent, h } from 'vue'
import { createContractComponent } from '../create-contract-component'

const ButtonComponent = createContractComponent({
  tag: 'button' as const,
  name: 'Button',
  defaults: { type: 'button' as const },
  styling: { base: 'btn' },
})

// SFC wrapper so Vue CT can mount a .vue file; createContractComponent returns
// a defineComponent result which Vue CT can only mount when wrapped in an SFC.
export default defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(ButtonComponent, attrs, slots)
  },
})
</script>
