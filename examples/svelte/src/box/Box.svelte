<script lang="ts">
  import Polymorphic from 'praxis-kit/svelte/Polymorphic.svelte'
  import { boxBundle } from './box'
  import type { Snippet } from 'svelte'

  interface Props {
    flex?: boolean
    grid?: boolean
    direction?: 'row' | 'col'
    align?: 'start' | 'center' | 'end' | 'stretch'
    gap?: 'none' | 'sm' | 'md' | 'lg'
    cols?: '2' | '3' | '4'
    variantKey?: 'row' | 'stack'
    class?: string
    children?: Snippet
    [key: string]: unknown
  }

  let { children, ...rest }: Props = $props()
</script>

<Polymorphic bundle={boxBundle} {...rest}>
  {@render children?.()}
</Polymorphic>
