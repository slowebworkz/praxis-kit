<script lang="ts">
  import Polymorphic from './Polymorphic.svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'
  import type { StringMap } from '@praxis-kit/primitive'

  type Step = { displayProps: StringMap<boolean>; layout?: string; className: string }
  let { bundle, initial }: { bundle: AnyBuiltRuntime; initial: Step } = $props()
  let displayProps = $state(initial.displayProps)
  let layout = $state(initial.layout)
  let className = $state(initial.className)

  export function setStep(step: Step): void {
    displayProps = step.displayProps
    layout = step.layout
    className = step.className
  }
</script>

<Polymorphic {bundle} {...displayProps} {layout} class={className} />
