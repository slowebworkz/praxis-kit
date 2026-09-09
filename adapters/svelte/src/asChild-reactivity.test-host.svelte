<script lang="ts">
  import Polymorphic from './Polymorphic.svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'

  // A real $state-driven host, not @testing-library/svelte's rerender() — see
  // asChild-reactivity.test.ts for why: createRawSnippet's params are captured once and are not
  // reactive (a documented limitation of that testing helper, not of Polymorphic.svelte itself).
  let { bundle }: { bundle: AnyBuiltRuntime } = $props()
  let extra = $state('a')

  export function setExtra(value: string): void {
    extra = value
  }
</script>

<Polymorphic {bundle} asChild class={extra}>
  {#snippet children(props)}
    <a data-testid="target" {...props}>link</a>
  {/snippet}
</Polymorphic>
