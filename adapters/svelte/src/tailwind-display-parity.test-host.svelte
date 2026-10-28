<script lang="ts">
  import Polymorphic from './Polymorphic.svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'

  let { bundle, className }: { bundle: AnyBuiltRuntime; className: string } = $props()
</script>

<Polymorphic {bundle} flex={true} layout="grid" class={className} />
