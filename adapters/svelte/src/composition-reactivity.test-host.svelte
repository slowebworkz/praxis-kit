<script lang="ts">
  import Polymorphic from './Polymorphic.svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'

  // A real $state-driven host (see asChild-reactivity.test.ts for why `rerender()` can't be used):
  // it owns a shared variant, a partner-only variant, and a plain DOM attribute so a test can change them after mount.
  let { bundle }: { bundle: AnyBuiltRuntime } = $props()
  let intent = $state('ghost')
  let tone = $state('quiet')
  let probe = $state('one')

  export function setIntent(value: string): void {
    intent = value
  }
  export function setTone(value: string): void {
    tone = value
  }
  export function setProbe(value: string): void {
    probe = value
  }
</script>

<Polymorphic {bundle} {intent} {tone} data-probe={probe} />
