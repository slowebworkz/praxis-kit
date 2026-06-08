<script lang="ts">
  import Polymorphic from '@praxis-kit/svelte/Polymorphic.svelte'
  import { listBundle } from './bundles'
  import type { Snippet } from 'svelte'

  interface Props {
    children?: Snippet
    [key: string]: unknown
  }

  let { children, ...rest }: Props = $props()
</script>

<Polymorphic bundle={listBundle} {...rest}>
  {@render children?.()}
</Polymorphic>
