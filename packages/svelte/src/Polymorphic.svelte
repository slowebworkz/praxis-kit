<script lang="ts">
  import { isKnownAriaRole } from '@praxis-ui/core'
  import type { ElementType, IntrinsicProps } from '@praxis-ui/core'
  import { applyFilter } from '@praxis-ui/adapter-utils'
  import type { Snippet } from 'svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'
  import type { UnknownProps } from './types/primitives'

  interface Props {
    bundle: AnyBuiltRuntime
    // Restricted to strings: <svelte:element> only accepts string tags.
    // Svelte component `as` values are not supported in this adapter.
    as?: string
    asChild?: boolean
    class?: string
    variantKey?: string
    children?: Snippet | Snippet<[UnknownProps]>
    [key: string]: unknown
  }

  let { bundle, as: asProp, asChild, class: cls, variantKey, children, ...rest }: Props = $props()

  function buildDomProps(
    props: UnknownProps,
    classStr: string,
    tag: ElementType,
  ): Record<string, unknown> {
    const { role, ...r } = props
    const ep: IntrinsicProps = { ...(r as IntrinsicProps), class: classStr }
    if (isKnownAriaRole(role)) ep.role = role
    if (typeof tag !== 'string') return ep as Record<string, unknown>
    return bundle.runtime.resolveAria(tag, ep).props as Record<string, unknown>
  }

  function buildSlotProps(props: UnknownProps, classStr: string): UnknownProps {
    const { role, ...r } = props
    return {
      ...r,
      class: classStr,
      ...(isKnownAriaRole(role) && { role }),
    }
  }

  const tag = $derived(bundle.runtime.resolveTag(asProp as ElementType | undefined))
  const mergedProps = $derived(bundle.runtime.resolveProps(rest as UnknownProps))
  const resolvedClass = $derived(
    bundle.runtime.resolveClasses(tag, mergedProps, cls as string | undefined, variantKey),
  )
  const filteredProps = $derived(
    applyFilter(mergedProps, bundle.filterProps, bundle.runtime.options.variantKeys),
  )
  const domProps = $derived(buildDomProps(filteredProps, resolvedClass, tag))

  // Resolves whether to render as child slot; also enforces as+asChild mutual exclusion.
  const useAsChild = $derived.by(() => {
    if (!asChild) return false
    if (asProp !== undefined) {
      bundle.slotValidator.assertExclusive()
      return false
    }
    return true
  })
</script>

{#if useAsChild}
  {#if children}
    {@render (children as Snippet<[UnknownProps]>)(buildSlotProps(filteredProps, resolvedClass))}
  {/if}
{:else}
  <svelte:element this={tag as string} {...domProps}>
    {@render (children as Snippet | undefined)?.()}
  </svelte:element>
{/if}
