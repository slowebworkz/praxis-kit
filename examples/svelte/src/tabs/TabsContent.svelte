<script lang="ts">
  import Polymorphic from '@praxis-kit/svelte/Polymorphic.svelte'
  import { contentBundle } from './bundles'
  import { getTabsContext } from './context'
  import { tabId, panelId } from './utils'
  import type { Snippet } from 'svelte'

  interface Props {
    value: string
    children?: Snippet
  }

  let { value, children }: Props = $props()

  const ctx = getTabsContext()
  const active = $derived(ctx.value() === value)
</script>

{#if active}
  <Polymorphic
    bundle={contentBundle}
    id={panelId(ctx.instanceId, value)}
    aria-labelledby={tabId(ctx.instanceId, value)}
  >
    {@render children?.()}
  </Polymorphic>
{/if}
