<script lang="ts">
  import Polymorphic from './Polymorphic.svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'
  import type { StringMap } from '@praxis-kit/primitive'

  type Step = { as?: string; displayProps?: StringMap<boolean>; className?: string }
  let { bundle, initial }: { bundle: AnyBuiltRuntime; initial: Step } = $props()
  let tag = $state(initial.as)
  let displayProps = $state(initial.displayProps ?? {})
  let className = $state(initial.className ?? '')

  export function setStep(step: Step): void {
    tag = step.as
    displayProps = step.displayProps ?? {}
    className = step.className ?? ''
  }
</script>

<Polymorphic {bundle} {...(tag === undefined ? {} : { as: tag })} {...displayProps} alt={tag === 'img' ? '' : undefined} class={className} />
