<script lang="ts">
  import type { StringMap } from '@praxis-kit/primitive'
  import Polymorphic from './Polymorphic.svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'

  let { bundle, className, layout, displayProps = {} }: {
    bundle: AnyBuiltRuntime
    className: string
    layout?: string
    displayProps?: StringMap<boolean>
  } = $props()
</script>

<Polymorphic {bundle} {...displayProps} layout={layout as never} class={className} />
