<!--
  @component
  Renders a `createContractComponent` bundle. Every praxis-kit component in the Svelte adapter
  is a bundle passed to this component via the `bundle` prop:

  ```svelte
  <Polymorphic {bundle} intent="ghost" as="a" href="/home">Home</Polymorphic>
  ```

  Resolves the tag (`as` or the bundle's default), variant classes, filtered props, and ARIA
  attributes, then renders the result via `<svelte:element>` — or, with `asChild`, renders
  `children` as a snippet receiving the resolved props instead of a host element.
-->
<script module lang="ts">
  declare const process: { env: { NODE_ENV: string } }
</script>

<script lang="ts">
  import { enforceAllowedAs, isKnownAriaRole } from '@praxis-kit/core'
  import type { ElementType, IntrinsicProps } from '@praxis-kit/core'
  import { isObject, isString } from '@praxis-kit/guards'
  import {
    applyFilter,
    filterOwnedProps,
    mergeClassNames,
    mergeSlotProps,
    resolveNormalizedProps,
  } from '@praxis-kit/adapter-utils'
  import type { Snippet } from 'svelte'
  import Polymorphic from './Polymorphic.svelte'
  import type {
    PolymorphicComponentProps,
    ResolvedAttributes,
    StyleObject,
    UnknownProps,
  } from './types'

  let {
    bundle,
    as: asProp,
    asChild,
    class: cls,
    recipe,
    children,
    ...rest
  }: PolymorphicComponentProps = $props()
  let hostEl: Element | undefined = $state()

  // Behavior contract: `event-normalization.test.ts`; user-facing note: README → "Event handlers
  // vs. component callbacks". Edit those together with this function.
  //
  // Svelte 5 event delegation requires lowercase handler names (onclick, onfocus…). This is a
  // deliberate, documented compatibility feature — not an accident of the regex — so a bundle's
  // caller can write React-style camelCase (onClick, onPointerDown) and it reaches
  // <svelte:element> as the native lowercase name Svelte's runtime binds via addEventListener.
  //
  // The contract only covers camelCase→lowercase for keys already shaped like `onXxx`; every
  // "on"-prefixed key, normalized or not, is still treated as event-related by Svelte's own
  // attribute-spreading runtime (a non-function value is silently dropped, not rendered as a
  // literal attribute) — including a component-level "callback prop" that happens to start with
  // "on" (`onValueChange`), which becomes a dead listener rather than a plain callback. See
  // `DECISIONS.md` → "`adapters/svelte` — the event-normalization contract" and
  // `event-normalization.test.ts` for the exact pinned cases.
  const EVENT_RE = /^on[A-Z]/
  function normalizeEventKeys(props: UnknownProps): UnknownProps {
    const out: ResolvedAttributes = {}
    for (const k in props) {
      out[EVENT_RE.test(k) ? k.toLowerCase() : k] = (props as ResolvedAttributes)[k]
    }
    return out as UnknownProps
  }

  // key.replace(/([A-Z])/g, '-$1') camelCase→kebab-case is also what makes a CSS custom property
  // (`'--my-color'`) pass through untouched — it has no uppercase letters to rewrite — and what
  // makes a vendor-prefixed key (`WebkitLineClamp`) come out correctly hyphenated
  // (`-webkit-line-clamp`, a leading dash and all — that IS the real CSS property name). Both are
  // asserted by test, not left as an implicit property of the regex. `value == null` (not
  // `=== undefined`) skips both `null` and `undefined` values but keeps a falsy `0`.
  function serializeStyle(style: StyleObject): string {
    let result = ''
    for (const key in style) {
      const value = style[key]
      if (value == null) continue
      if (result) result += ';'
      result += `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}:${value}`
    }
    return result
  }

  function buildDomProps(
    props: UnknownProps,
    classStr: string | undefined,
    tag: ElementType,
    normalizedProps: UnknownProps,
  ): ResolvedAttributes {
    const { role, style, ...r } = normalizeEventKeys(props)
    const styleStr = isObject(style, true)
      ? serializeStyle(style as StyleObject)
      : (style as string | undefined)
    const ep: IntrinsicProps = {
      ...(r as IntrinsicProps),
      class: classStr,
      ...(styleStr !== undefined && { style: styleStr }),
    }
    if (isKnownAriaRole(role)) ep.role = role
    if (!isString(tag)) return ep as ResolvedAttributes
    return bundle.runtime.resolveAria(tag, ep, normalizedProps as IntrinsicProps)
      .props as ResolvedAttributes
  }

  // Unlike buildDomProps above, this intentionally skips normalizeEventKeys and style
  // serialization — the asChild path hands props straight to a caller-authored snippet, which
  // spreads them onto its own element via ordinary JSX/attribute semantics, not through
  // <svelte:element>'s own attribute application; event-handler keys keep their caller-authored
  // casing (`onClick`, not lowercased to `onclick`), and `style` passes through however the
  // caller wrote it (object or string), unserialized. See `ResolvedSlotProps<G>`
  // (types/resolved-slot-props.ts) for the type this produces — it deliberately omits `style`
  // rather than asserting either shape, for this exact reason.
  function buildSlotProps(props: UnknownProps, classStr: string | undefined): UnknownProps {
    const { role, ...r } = props
    return {
      ...r,
      class: classStr,
      ...(isKnownAriaRole(role) && { role }),
    }
  }

  // `mergeSlotProps` special-cases `className` (React/Preact's prop name) for concatenation —
  // Svelte (like Solid and Vue) uses `class` instead, which would otherwise fall through
  // `mergeSlotProps`'s own policy as an ordinary "child wins" key rather than concatenating.
  // Used by the `compose` branch below, which (unlike Vue's native `cloneVNode` merge) has to
  // merge these prop bags itself.
  function mergeComposedProps(withProps: UnknownProps, innerProps: UnknownProps): UnknownProps {
    const merged = mergeSlotProps(withProps, innerProps)
    const mergedClass = mergeClassNames(
      (withProps as ResolvedAttributes)['class'],
      (innerProps as ResolvedAttributes)['class'],
    )
    return { ...merged, ...(mergedClass && { class: mergedClass }) }
  }

  // Combined composition styling replaces, rather than concatenates, the partner's own class.
  function composeProps(withProps: UnknownProps, innerProps: UnknownProps): UnknownProps {
    if (!composing) return mergeComposedProps(withProps, innerProps)
    const { class: _partnerClass, ...partnerRest } = withProps as ResolvedAttributes
    const { class: _innerClass, ...innerRest } = innerProps as ResolvedAttributes
    return {
      ...mergeSlotProps(partnerRest as UnknownProps, innerRest as UnknownProps),
      ...(composedClass !== undefined && { class: composedClass }),
    }
  }

  const tag = $derived(bundle.runtime.resolveTag(asProp as ElementType | undefined))
  const mergedProps = $derived(bundle.runtime.resolveProps(rest as UnknownProps))
  const normalizedProps = $derived.by(() => {
    const { runtime: { options } } = bundle
    // Folded into this derived (rather than a standalone one) so it's guaranteed to run on
    // both SSR and DOM — $derived is lazy in Svelte 5 and only evaluates when read; this one
    // is read downstream by resolvedClass/filteredProps/domProps, which the template renders.
    if (options.allowedAs !== undefined) {
      enforceAllowedAs(
        tag,
        options.allowedAs,
        options.diagnostics,
        options.displayName,
      )
    }
    return resolveNormalizedProps(options, tag, mergedProps)
  })
  // Automatic composition with a Praxis partner owns class resolution (see `composedClass` below),
  // so the primary must not also resolve on its own: it would reject a recipe that only the
  // partner defines, and its result is discarded by `composeProps` anyway.
  const composing = $derived(bundle.resolveComposedClasses !== undefined && !asChild)
  const resolvedClass = $derived(
    composing
      ? undefined
      : bundle.runtime.resolveClasses(tag, normalizedProps, cls as string | undefined, recipe),
  )
  const filteredProps = $derived(
    applyFilter(normalizedProps, bundle.filterProps, bundle.runtime.options.variantKeys),
  )
  const domProps = $derived(buildDomProps(filteredProps, resolvedClass, tag, normalizedProps))

  // Behavior contract: `Polymorphic.test.ts` → "composition styling" (including the path-parity
  // matrix), the shared `conformance — composition styling` cases, and `.vscode/COMPOSE.md`.
  //
  // Automatic composition with a Praxis partner resolves one combined class string through the
  // shared pipeline (selected by `compose.with` alone, never by `allProps`). The partner receives
  // `compose.defaults` plus, with `allProps`, this component's raw props; its own separately-
  // resolved class (`withProps.class`) is superseded rather than concatenated. Explicit `asChild`
  // never reaches the compose branch, so it keeps ordinary own-contract styling.
  const composedClass = $derived(
    composing
      ? bundle.resolveComposedClasses?.(
          tag,
          {
            ...filterOwnedProps(bundle.compose?.defaults, bundle.ownedKeys),
            ...(bundle.compose?.allProps ? filterOwnedProps(rest, bundle.ownedKeys) : {}),
          },
          rest,
          cls as string | undefined,
          recipe,
        )
      : undefined,
  )

  // Resolves whether to render as child slot; also enforces as+asChild mutual exclusion.
  const useAsChild = $derived.by(() => {
    if (!asChild) return false
    if (asProp !== undefined) {
      bundle.slotValidator.assertExclusive()
      return false
    }
    return true
  })

  // DOM-only (like Lit skipping htmlChildrenEvaluatorFn for its SSR renderToString). Merely
  // *registering* $effect during svelte/server's render() throws ("effect_orphan") — it's not
  // enough to no-op inside the callback, the rune call itself must never happen during SSR.
  // Reads real child nodes off the mounted host, same approach as Lit's Array.from(this.childNodes).
  // Not reachable in the asChild branch — no host element there.
  if (typeof document !== 'undefined') {
    $effect(() => {
      if (process.env.NODE_ENV === 'production' || !hostEl) return
      const childArray = Array.from(hostEl.childNodes)
      bundle.childrenEvaluator?.evaluate(childArray, { tag, props: normalizedProps })
      bundle.runtime.options.htmlChildrenEvaluatorFn
        ?.(tag)
        ?.evaluate(childArray, { tag, props: normalizedProps })
    })

    const onElement = $derived(bundle.onElement)

    // Unlike the effect above, this runs in every environment (not dev-only) — onElement is a
    // real runtime feature, not a diagnostic. Re-runs (cleaning up the previous call first, via
    // the returned teardown) whenever hostEl changes identity, e.g. the resolved tag changes and
    // Svelte mounts a new host element.
    $effect(() => {
      if (!hostEl) return
      const cleanup = onElement?.(hostEl, () => normalizedProps)
      return () => cleanup?.()
    })
  }
</script>

{#if bundle.compose?.with !== undefined && !asChild}
  <!--
    `compose` makes this component always render `asChild` into `compose.with`, as if the
    consumer had hand-written `<With asChild><ThisComponent {...props} /></With>` — but only when
    the consumer didn't already take explicit control via their own `asChild` (checked above).
    Svelte has no clone step to piggyback on (unlike React/Preact/Vue's `cloneElement`/
    `cloneVNode`), so this synthesizes the same shape natively: `With` always renders through its
    own `asChild` render-callback mode, and the callback — this component's own normal-mode
    output — merges `With`'s handed-back slot props onto itself via `mergeComposedProps`, the
    same policy `mergeSlotProps` already gives every other adapter.

    `ownChildren` captures the real, script-level `children` *before* the nested `{#snippet
    children(...)}` block below declares its own same-named binding for `With`'s own asChild
    contract — referencing `children` directly inside that block would resolve to the snippet
    itself, not this component's real consumer-supplied content.

    `bundle.compose.allProps` additionally spreads this component's own raw `rest` props onto
    `With` (before the `asChild` prop below, so that always wins) — opt-in, mirroring the same
    `compose.allProps` flag on every other adapter.
  -->
  {@const With = bundle.compose.with}
  {@const ownChildren = children}
  <Polymorphic
    bundle={With}
    {...filterOwnedProps(bundle.compose.defaults, bundle.ownedKeys)}
    {...(bundle.compose.allProps ? filterOwnedProps(rest, bundle.ownedKeys) : {})}
    asChild
  >
    {#snippet children(withProps)}
      {#if isString(tag)}
        <svelte:element
          this={tag}
          bind:this={hostEl}
          {...composeProps(withProps as UnknownProps, domProps)}
        >
          {@render (ownChildren as Snippet | undefined)?.()}
        </svelte:element>
      {:else}
        {@const Comp = tag}
        <Comp {...composeProps(withProps as UnknownProps, buildSlotProps(filteredProps, resolvedClass))}>
          {@render (ownChildren as Snippet | undefined)?.()}
        </Comp>
      {/if}
    {/snippet}
  </Polymorphic>
{:else if useAsChild}
  {#if children}
    {@render (children as Snippet<[UnknownProps]>)(buildSlotProps(filteredProps, resolvedClass))}
  {/if}
{:else if isString(tag)}
  <svelte:element this={tag} bind:this={hostEl} {...domProps}>
    {@render (children as Snippet | undefined)?.()}
  </svelte:element>
{:else}
  <!--
    `tag` resolved to a praxis-kit component reference rather than a tag name (the
    `as`/`allowedAs` component-reference feature). `<svelte:element>`'s `this` can only ever be a
    tag-name string, so this is a genuinely separate render path, not a cosmetic variant of the
    one above. Uses `buildSlotProps` — the same call the `asChild` branch above makes — not
    `domProps`: a nested component expects idiomatic props (caller-cased event names, a `style`
    object if that's what it wants), not the DOM-serialized shape `buildDomProps` produces for a
    literal element (lowercased event names, a stringified `style` attribute). There is no host
    element for `bind:this` to target here, same as the `asChild` branch — the `$effect`s above
    already guard on `!hostEl`.
  -->
  {@const Comp = tag}
  <Comp {...buildSlotProps(filteredProps, resolvedClass)}>
    {@render (children as Snippet | undefined)?.()}
  </Comp>
{/if}
