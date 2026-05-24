<script lang="ts">
  import { isKnownAriaRole } from '@polymorphic-ui/core'
  import type { ElementType, IntrinsicProps } from '@polymorphic-ui/core'
  import type { Snippet } from 'svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'
  import type { FilterPredicate, UnknownProps } from './types/primitives'

  interface Props {
    bundle: AnyBuiltRuntime
    // Restricted to strings: <svelte:element> only accepts string tags.
    // Svelte component `as` values are not supported in this adapter.
    as?: string
    class?: string
    variantKey?: string
    children?: Snippet
    [key: string]: unknown
  }

  let { bundle, as: asProp, class: cls, variantKey, children, ...rest }: Props = $props()

  function applyFilter(
    props: UnknownProps,
    fp: FilterPredicate,
    variantKeys: ReadonlySet<string>,
  ): UnknownProps {
    const out: UnknownProps = {}
    for (const [k, v] of Object.entries(props)) {
      if (!fp(k, variantKeys)) out[k] = v
    }
    return out
  }

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

  const tag = $derived(bundle.runtime.resolveTag(asProp as ElementType | undefined))
  const mergedProps = $derived(bundle.runtime.resolveProps(rest as UnknownProps))
  const resolvedClass = $derived(
    bundle.runtime.resolveClasses(tag, mergedProps, cls as string | undefined, variantKey),
  )
  const filteredProps = $derived(
    applyFilter(mergedProps, bundle.filterProps, bundle.runtime.options.variantKeys),
  )
  const domProps = $derived(buildDomProps(filteredProps, resolvedClass, tag))
</script>

<svelte:element this={tag as string} {...domProps}>
  {@render children?.()}
</svelte:element>
