<script lang="ts">
  import Polymorphic from './Polymorphic.svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'

  let { bundle }: { bundle: AnyBuiltRuntime } = $props()
  let flex = $state(false)

  export function setFlex(value: boolean): void {
    flex = value
  }
</script>

<Polymorphic {bundle} {flex} />
