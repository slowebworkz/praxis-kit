<script lang="ts">
  import Polymorphic from '@praxis-kit/svelte/Polymorphic.svelte'
  import { indicatorBundle } from './bundles'
  import { getTabsContext } from './context'

  interface Props {
    class?: string
  }

  let { class: cls }: Props = $props()

  const ctx = getTabsContext()
</script>

<Polymorphic
  bundle={indicatorBundle}
  aria-hidden={true}
  data-active-value={ctx.value()}
  class={cls}
/>
