<script lang="ts">
  import Polymorphic from '@praxis-ui/svelte/Polymorphic.svelte'
  import { rootBundle } from './bundles'
  import { setTabsContext } from './context'
  import type { Snippet } from 'svelte'

  interface Props {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    children?: Snippet
  }

  let { value: controlledValue, defaultValue = '', onValueChange, children }: Props = $props()

  let _id = 0
  const instanceId = `tabs-${++_id}`
  let uncontrolled = $state(defaultValue)

  const value = () => controlledValue ?? uncontrolled

  const setValue = (next: string) => {
    if (controlledValue === undefined) uncontrolled = next
    onValueChange?.(next)
  }

  setTabsContext({ instanceId, value, setValue })
</script>

<Polymorphic bundle={rootBundle}>
  {@render children?.()}
</Polymorphic>
