<script lang="ts">
import { defineComponent, h } from 'vue'
import { createContractComponent } from '../create-contract-component'

const AlertRegionComponent = createContractComponent({
  tag: 'div' as const,
  name: 'AlertRegion',
  enforcement: { strict: false },
})

export default defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(AlertRegionComponent, attrs, slots)
  },
})
</script>
