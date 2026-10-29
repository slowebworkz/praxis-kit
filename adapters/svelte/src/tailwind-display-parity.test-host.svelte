<script lang="ts">
  import Polymorphic from './Polymorphic.svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'

  let { bundle, className, layout = 'grid', flex = true }: {
    bundle: AnyBuiltRuntime
    className: string
    layout?: string
    flex?: boolean
  } = $props()
</script>

<Polymorphic {bundle} {flex} layout={layout as never} class={className} />
