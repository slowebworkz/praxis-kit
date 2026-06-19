<script lang="ts">
  import { isKnownAriaRole } from '@praxis-kit/core'
  import type { ElementType, IntrinsicProps } from '@praxis-kit/core'
  import { applyFilter } from '@praxis-kit/adapter-utils'
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
    recipe?: string
    children?: Snippet | Snippet<[UnknownProps]>
    [key: string]: unknown
  }

  let { bundle, as: asProp, asChild, class: cls, recipe, children, ...rest }: Props = $props()

  // Svelte 5 event delegation requires lowercase handler names (onclick, onfocus…).
  // Normalize React-style camelCase handlers so spreads on <svelte:element> work.
  const EVENT_RE = /^on[A-Z]/
  function normalizeEventKeys(props: UnknownProps): UnknownProps {
    const out: Record<string, unknown> = {}
    for (const k in props) {
      out[EVENT_RE.test(k) ? k.toLowerCase() : k] = (props as Record<string, unknown>)[k]
    }
    return out as UnknownProps
  }

  function buildDomProps(
    props: UnknownProps,
    classStr: string,
    tag: ElementType,
  ): Record<string, unknown> {
    const { role, style, ...r } = normalizeEventKeys(props)
    const styleStr =
      style !== undefined && typeof style === 'object'
        ? Object.entries(style as Record<string, string>)
            .filter(([, v]) => v != null)
            .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
            .join(';')
        : (style as string | undefined)
    const ep: IntrinsicProps = {
      ...(r as IntrinsicProps),
      class: classStr,
      ...(styleStr !== undefined && { style: styleStr }),
    }
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
  const normalizedProps = $derived.by(() => {
    const base = bundle.runtime.options.normalizeFn
      ? bundle.runtime.options.normalizeFn(mergedProps)
      : mergedProps
    const htmlNormalizers = bundle.runtime.options.htmlPropNormalizersFn?.(tag)
    return htmlNormalizers?.length
      ? htmlNormalizers.reduce((acc, fn) => ({ ...acc, ...fn(acc) }), base)
      : base
  })
  const resolvedClass = $derived(
    bundle.runtime.resolveClasses(tag, normalizedProps, cls as string | undefined, recipe),
  )
  const filteredProps = $derived(
    applyFilter(normalizedProps, bundle.filterProps, bundle.runtime.options.variantKeys),
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
