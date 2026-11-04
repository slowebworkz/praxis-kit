<script lang="ts">
  import type { StringMap } from '@praxis-kit/primitive'
  import Polymorphic from './Polymorphic.svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'

  let { bundle, tag = 'div', className, layout, displayProps = {}, variantProps = {} }: {
    bundle: AnyBuiltRuntime
    tag?: string
    className: string
    layout?: string
    displayProps?: StringMap<boolean>
    variantProps?: StringMap<string>
  } = $props()
</script>

<Polymorphic {bundle} as={tag} {...displayProps} {...variantProps} layout={layout as never} class={className} />
