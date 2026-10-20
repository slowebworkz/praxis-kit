<script lang="ts">
  import Polymorphic from './Polymorphic.svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'

  // A real $state-driven host whose `as` prop can change after mount, so a test can prove the
  // resolved tag switching replaces the host element and re-runs the DOM lifecycle effects.
  let { bundle }: { bundle: AnyBuiltRuntime } = $props()
  let tag = $state('div')

  export function setTag(value: string): void {
    tag = value
  }
</script>

<Polymorphic {bundle} as={tag}>content</Polymorphic>
