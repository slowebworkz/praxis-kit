<script lang="ts">
  import Polymorphic from 'praxis-kit/svelte/Polymorphic.svelte'
  import { triggerBundle } from './bundles'
  import { getTabsContext } from './context'
  import { tabId, panelId } from './utils'
  import type { Snippet } from 'svelte'

  interface Props {
    value: string
    children?: Snippet
  }

  let { value, children }: Props = $props()

  const ctx = getTabsContext()
  const selected = $derived(ctx.value() === value)
</script>

<Polymorphic
  bundle={triggerBundle}
  id={tabId(ctx.instanceId, value)}
  role="tab"
  aria-selected={selected}
  aria-controls={panelId(ctx.instanceId, value)}
  data-state={selected ? 'active' : 'inactive'}
  onclick={() => ctx.setValue(value)}
>
  {@render children?.()}
</Polymorphic>
