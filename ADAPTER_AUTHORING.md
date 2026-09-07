# Adapter Authoring Guide

This guide explains how to write a new framework adapter against the `@praxis-kit/core` runtime
contract. Seven adapters currently exist — React, Preact, Vue, Solid, Svelte, Lit, and Web (vanilla
custom elements) — and every one of them fits into one of four categories below. Core has required
no changes for any of them.

---

## What an adapter does

An adapter connects the framework-agnostic core runtime to a specific framework's rendering model.
Its responsibilities are:

1. **Build the runtime** — call `buildCoreRuntime` (from `@praxis-kit/adapter-utils`) with the
   user's normalized factory options. It wires `createPolymorphic` (from `@praxis-kit/core`), slot
   validation, child evaluation, and prop filtering into a runtime bundle held in the component's
   closure.
2. **Resolve the tag** — call `runtime.resolveTag(as)` to get the concrete element type for this
   render. On Lit/Web there is no `as` — the DOM tag is fixed at `customElements.define()` time (see
   "Custom Element adapters" below), so this always resolves to `options.tag`.
3. **Merge and normalize props** — call `runtime.resolveProps(rest)` to apply default props and
   preset (`recipe`) merging, then `resolveNormalizedProps(runtime.options, tag, mergedProps)` to
   run the built-in HTML/ARIA prop normalizers (`disabledProps`, etc.) and the caller's own
   `normalize`, in that fixed order — every adapter and the SSR path share this single function so
   the ordering can't drift between them.
4. **Resolve classes** — call `runtime.resolveClasses(tag, normalizedProps, className, recipe)` to
   produce the final class string. The fourth argument is the resolved `recipe` prop (the preset
   selector — see Step 4), not a `variantKey`.
5. **Filter props** — call `applyFilter(normalizedProps, filterProps, runtime.options.variantKeys)`
   to strip variant keys and owned plugin keys before forwarding to the DOM. `filterProps` itself
   comes from `composeFilter(ownedKeys, normalized.filterProps)` in Step 1.
6. **Normalize ARIA** — call `runtime.resolveAria(tag, elementProps, normalizedProps)` on intrinsic
   (string) tags to remove redundant or invalid roles. The call is safe when `enforcement` was not
   declared — it returns props unchanged.
7. **Evaluate children** — call `childrenEvaluator?.evaluate(children, { tag, props })` when
   `enforcement.children` is present, **and** separately call
   `runtime.options.htmlChildrenEvaluatorFn?.(tag)?.evaluate(...)` — the built-in HTML content-model
   rules, which run independently of whether the component declared its own `enforcement.children`.
8. **Render** — hand off the resolved tag, props, and children to the framework's own rendering
   primitive. VDOM/Reactive/Compile-time adapters additionally support a `render` callback prop that
   takes over final output entirely, bypassing both `asChild`/Slot and intrinsic rendering.

The core never touches the framework. The adapter never reimplements variant resolution, class
merging, ARIA rules, or child cardinality logic.

---

## Package structure

Follow the existing adapter layout — note `adapters/`, not `packages/`:

```text
adapters/<framework>/
  src/
    build-runtime.ts              # normalizeOptions + buildCoreRuntime wiring
    create-contract-component.ts
    <framework>-options.ts        # <Framework>FactoryOptions type
    index.ts                      # public exports
    render.ts / render.tsx        # per-render logic (or embedded in .svelte)
    types/
      built-runtime.ts
      normalized-options.ts
      polymorphic-props.ts        # PolymorphicProps<G, TAs> — VDOM adapters only
      primitives.ts
      props.ts
      render.ts
      runtime.ts
      index.ts
  package.json
  tsconfig.json
  vitest.config.ts
  vitest.ssr.config.ts            # if SSR requires separate resolve conditions
```

No per-adapter build step (no `tsup.config.ts`/`tsdown.config.ts`) — every adapter is
source-consumed within the workspace via `workspace:*`; `packages/kit`'s own `tsdown.config.ts` is
what compiles it for publishing, one entry per adapter.

Add `@praxis-kit/adapter-utils` as a dependency in `package.json`. It provides `buildCoreRuntime`,
`buildEngines`, `composeFilter`, `applyFilter`, `resolveNormalizedProps`, and `SlotValidator` — the
shared logic used by every adapter.

---

## Step 1 — `build-runtime.ts`

This file is nearly identical across adapters. Copy from an existing one and adjust the import of
`<Framework>FactoryOptions`.

```ts
import {
  buildCoreRuntime,
  buildEngines,
  composeFilter,
  resolveAdapterCommonOptions,
} from '@praxis-kit/adapter-utils'
import type { FrameworkFactoryOptions } from './framework-options'
import type { BuiltRuntime, NormalizedOptions } from './types'

function normalizeOptions<G>(options: FrameworkFactoryOptions): NormalizedOptions<G> {
  return {
    ...options,
    ...resolveAdapterCommonOptions(options),
  } as NormalizedOptions<G>
}

export function buildRuntime<G>(options: FrameworkFactoryOptions): BuiltRuntime<G> {
  const normalized = normalizeOptions<G>(options)
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)
  const { childrenEvaluator } = buildEngines(
    normalized.diagnostics,
    normalized.enforcement?.children,
    normalized.name,
    {
      exclusiveChildren: normalized.enforcement?.exclusiveChildren,
      allowText: normalized.enforcement?.allowText,
    },
  )
  const filterProps = composeFilter(ownedKeys, normalized.filterProps)
  return { runtime, filterProps, ...(childrenEvaluator !== undefined && { childrenEvaluator }) }
}
```

`resolveAdapterCommonOptions` resolves the two fields every adapter's `NormalizedOptions` must
supply — `name` (default `'PolymorphicComponent'`) and `diagnostics` (a real `Diagnostics` instance,
resolved from the `'warn'`/`'throw'`/`'silent'`/custom-instance union — default `throwDiagnostics`
for React/Vue/Preact/Solid/Svelte; Lit/Web pass `silentDiagnostics` as an override, since a custom
element with no owner around to see a console warning shouldn't throw by default). Core instantiates
the ARIA engine only when `enforcement` is declared; without it, `runtime.resolveAria()` returns
props unchanged and there is no engine overhead.

`buildCoreRuntime` calls `createPolymorphic` (from `@praxis-kit/core`) and extracts the plugin's
owned keys. `buildEngines` creates a `ChildrenEvaluator` only when `enforcement.children` is present
— its fourth argument (`exclusiveChildren`/`allowText`) is a real, separate part of the signature,
not optional sugar. `composeFilter` merges plugin owned keys with the user-supplied `filterProps`
predicate. All of these are imported from `@praxis-kit/adapter-utils`.

---

## Step 2 — the render path

This is where adapters diverge most. Four categories, not three — Custom Element adapters are
architecturally distinct enough from the other three that they don't fit any existing bucket.

### VDOM adapters (React, Preact, Vue)

```ts
// Pseudocode — see adapters/react/src/shared/render.ts for the full version
function prepareRenderState(runtime, props, filterProps) {
  const { as, asChild, render, children, className, recipe, ...rest } = props
  const tag = runtime.resolveTag(as)
  const mergedProps = runtime.resolveProps(rest)
  const normalizedProps = resolveNormalizedProps(runtime.options, tag, mergedProps)
  const resolvedClass = runtime.resolveClasses(tag, normalizedProps, className, recipe)
  const filteredProps = applyFilter(normalizedProps, filterProps, runtime.options.variantKeys)
  return { tag, props: filteredProps, normalizedProps, className: resolvedClass, children }
}

function render({ runtime, props, filterProps, slotValidator, childrenEvaluator, ...rest }) {
  const state = prepareRenderState(runtime, props, filterProps)
  const delegates = isFunction(props.render) || (props.asChild && props.as === undefined)

  if (!isProduction && !delegates) {
    childrenEvaluator?.evaluate(normalizedChildren, { tag: state.tag, props: state.normalizedProps })
    runtime.options.htmlChildrenEvaluatorFn?.(state.tag)?.evaluate(normalizedChildren, { ... })
  }

  if (isFunction(props.render)) return props.render({ ...state.props, className: state.className })

  // asChild/Slot path, validated via slotValidator (mutual exclusion with `as`, single-child
  // cardinality — Slottable is the escape hatch for multiple children)
  const slotResult = tryRenderAsChild(state, ...)
  if (slotResult) return slotResult

  // Intrinsic tags get ARIA resolution; custom component targets don't
  const domProps =
    typeof state.tag === 'string'
      ? runtime.resolveAria(state.tag, elementProps, state.normalizedProps).props
      : elementProps
  return framework.createElement(state.tag, domProps)
}
```

**React/Preact ref handling differs**:

- React 19+ (`current/`): `ref` is a plain prop — read from `props.ref`, pass as `ref` in the
  element props object.
- React 18 (`legacy/`): use `forwardRef`; read `element.ref` for slot access.
- Preact: same as React 19+ (ref is a plain prop in Preact 10+).

### Reactive adapters (Solid)

Solid requires `createMemo` wrappers around each resolution step so that DOM updates are
fine-grained rather than driven by full re-renders. `splitProps` is used instead of manual
destructuring to preserve Solid's reactivity through the prop boundary.

```ts
// Solid — see adapters/solid/src/render.tsx
const [known, rest] = splitProps(props, SPLIT_KEYS)
const tag = createMemo(() => runtime.resolveTag(known.as))
const merged = createMemo(() => runtime.resolveProps(rest))
const normalized = createMemo(() => resolveNormalizedProps(runtime.options, tag(), merged()))
const cls = createMemo(() =>
  runtime.resolveClasses(tag(), normalized(), known.className, known.recipe),
)
const dom = createMemo(() => buildDomProps(applyFilter(normalized(), ...), cls(), tag()))
return <Dynamic component={tag()} {...dom()} />
```

### Compile-time adapters (Svelte)

Svelte components must come from `.svelte` files (compiler constraint). `createContractComponent`
returns the runtime bundle rather than a component function. The `.svelte` file receives it as a
`bundle` prop:

```svelte
<script lang="ts">
  let { bundle, as, class: cls, recipe, children, ...rest } = $props()
  const tag         = $derived(bundle.runtime.resolveTag(as))
  const merged      = $derived(bundle.runtime.resolveProps(rest))
  const normalized  = $derived(resolveNormalizedProps(bundle.runtime.options, tag, merged))
  const resolvedCls = $derived(bundle.runtime.resolveClasses(tag, normalized, cls, recipe))
  const filtered    = $derived(applyFilter(normalized, bundle.filterProps, bundle.runtime.options.variantKeys))
  const domProps    = $derived(buildDomProps(bundle.runtime, filtered, resolvedCls, tag))
</script>
<svelte:element this={tag} {...domProps}>{@render children?.()}</svelte:element>
```

Access `bundle.*` directly inside `$derived()` — do not destructure `bundle` at the top of the
script block, as Svelte will warn that the destructured values only capture the initial state.

### Custom Element adapters (Lit, Web)

The most architecturally distinct category — `createContractComponent` returns a `LitElement`
subclass (Lit) or a plain `HTMLElement` subclass (Web), not a component function. The consumer
registers it themselves: `customElements.define('praxis-button', Button)`.

**The single concept that governs everything here: `options.tag` is the semantic model, not the DOM
host.** `options.tag: 'button'` tells Praxis which ARIA roles, content-model rules, and built-in
prop normalizers (`disabledProps`, etc.) to resolve against — it is not, and can never be, the
actual DOM tag. The real DOM tag is whatever name a caller later passes to
`customElements.define(name, Button)`, decided entirely outside this function and not knowable by
it. Concretely:

```text
Praxis intrinsic model:  button          (options.tag — drives ARIA/content-model/normalizers)
DOM host:                praxis-button   (customElements.define()'s name — the actual element)
```

A direct consequence: `<praxis-button disabled>` gets `aria-disabled` from the `disabledProps`
normalizer, but the browser does **not** make the custom element keyboard-inert, form-participating,
or otherwise behave like a real `HTMLButtonElement` — no ARIA attribute on any element, custom or
not, ever supplies real interactive behavior. The contract layer and the host's actual interactive
behavior are, and have to stay, conceptually separate; `onElement` is the wiring point for a caller
who needs real behavior.

**No `as` prop.** A custom element's DOM tag is fixed at `customElements.define()` time, so there is
no tag for `as` to switch. It's filtered out of the raw attribute scan unconditionally (not just as
a declared property), so even an undeclared `as="…"` HTML attribute is inert — this is deliberate:
an earlier design treated `as` as a semantic-only override (resolving ARIA rules as if the element
were a different tag while the real DOM node stayed put), which both produced a real accessibility
footgun (`role="link"`-shaped output with none of an anchor's actual behavior) and made SSR disagree
with the live client.

**Preset selection uses the `recipe` property, backed by a `variant-key` attribute** — the JS
property name and the HTML attribute name differ (a common Lit convention for camelCase↔kebab-case,
not a Praxis-specific choice).

Rough shape (Lit; Web is the same idea without Lit's reactive-property system — see the note below):

```ts
class PolymorphicLitElement extends LitElement {
  static override get properties() {
    return { recipe: { type: String, attribute: 'variant-key' } /* ...variant/plugin keys */ }
  }

  protected override createRenderRoot() {
    return this // light DOM — the class pipeline applies directly to the host element
  }

  override updated() {
    if (this._praxisDirty) this._applyPraxis() // re-run only when a praxis-owned property changed
  }

  private _applyPraxis() {
    const props = this._buildProps() // scans real DOM attributes + Lit-managed properties
    diffAndApplyAttributes(this, resolveHostState(bundle, props), this._pipelineAttrs, props)
  }

  override render() {
    const { tag, normalizedProps } = resolveTagAndNormalizedProps(bundle, this._buildProps())
    this.childrenEvaluator?.evaluate(Array.from(this.childNodes), { tag, props: normalizedProps })
    return html`<slot></slot>`
  }
}
```

`resolveHostState`, `resolveTagAndNormalizedProps`, and `diffAndApplyAttributes` are the
Custom-Element-specific shared functions from `@praxis-kit/adapter-utils` — distinct from the VDOM
render path's `resolveNormalizedProps`/`applyFilter`, because there's no virtual DOM diff to lean
on; attribute changes have to be computed and applied directly against the live element.

**Web has no declared reactive properties**, unlike Lit's `static get properties()`. Property
assignment on the Web adapter doesn't automatically re-trigger the pipeline — it needs an explicit
`.update()` call. This is a real, tested behavioral difference between the two adapters, not an
oversight in one of them.

---

## Step 3 — `PolymorphicProps<G, TAs>`

For VDOM adapters, define a typed component surface using the framework's element prop types. The
pattern across React, Preact, and Vue is:

```ts
type ControlProps<G, TAs extends ElementType> =
  PropsOf<G> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> &   // strips the [k: string]: string|undefined leak
  { as?: TAs; className?: ClassName; recipe?: keyof RecipeOf<G>; ref?: ... }

type SharedProps<G, TAs> =
  Omit<FrameworkIntrinsicProps<TAs>, keyof ControlProps<G, TAs> | 'children' | 'ref'> &
  ControlProps<G, TAs>

export type PolymorphicProps<G, TAs = DefaultOf<G>> =
  Simplify<SharedProps<G, TAs> & { children?: FrameworkChildrenType }>
```

The `OmitIndexSignature` wrapper (from `type-fest`) is required. Without it,
`VariantProps<VariantMap>` (the default when no variants are defined) expands to
`{ [k: string]: string | undefined }`, which intersects with `{ [k: string]: unknown }` from
`PropsOf<G>` and causes `ref`, `children`, and all HTML attributes to resolve as
`string | undefined`.

Custom Element adapters (Lit, Web) don't need this — there's no typed JSX component surface to
narrow; the class's own reactive-property/attribute declarations are the public API. For Svelte, the
props interface is defined directly in the `.svelte` file's `<script lang="ts">` block and a
companion `.svelte.d.ts` declaration.

---

## Step 4 — `FrameworkFactoryOptions`

Extend `FactoryOptions` from core with framework-specific additions. Every VDOM adapter adds one
field:

```ts
import type { FactoryOptions } from '@praxis-kit/core'

export type FrameworkFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps, TAllowed> =
  FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps, TAllowed> & {
    /** Return true for any prop key that should be consumed but not forwarded to the DOM. */
    filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
  }
```

`filterProps` is the only framework-level extension across React, Preact, and Vue. React
additionally adds `slotComponent` (which `asChild`/Slot component to render through — a rendering
concern that doesn't belong in core). No adapter has needed to extend the core runtime contract
itself.

---

## Step 5 — SSR

**Lit and Web**: `renderContractToString` (`@praxis-kit/{lit,web}`) — deliberately _not_ named
`renderToString`. It serializes the resolved contract as intrinsic HTML (tag, normalized props,
resolved classes, ARIA attributes) using the shared `renderBundleToString`/`resolveHostState`
functions from `@praxis-kit/adapter-utils`, registered per-component via a `WeakMap` lookup
(`registerForSsr`). This is explicitly **not** Custom Element SSR/hydration — `renderBundleToString`
has no way to know what name a consumer will later pass to `customElements.define()`, so it can
never emit the real custom-element tag the browser would actually upgrade. Document this distinction
for any new custom-element-style adapter rather than letting a name imply parity with DOM SSR it
doesn't have.

**React**: `renderToString` from `react-dom/server`. **Vue**: `renderToString` from
`@vue/server-renderer`. **Preact**: `render` from `preact-render-to-string`. **Solid**:
`renderToString` from `solid-js/web` — requires a separate vitest config with
`conditions: ['development']` (no `'browser'`) so that `solid-js/web` resolves to its server build
rather than its browser build. **Svelte**: `render` from `svelte/server`.

---

## Step 6 — cross-adapter isolation

This repo enforces adapter isolation at the **root** ESLint config via `eslint-plugin-boundaries`,
not per-package config — there is no per-adapter `eslint.config.ts`.

Add your adapter to `configs/architecture.ts`:

1. A `boundaries/elements` entry: `{ type: '<framework>', pattern: 'adapters/<framework>/**/*' }`.
2. If the framework has its own npm package name (`lit`, `svelte`, `solid-js`, …), add it to the
   `core` boundary's disallow `source` list, so `@praxis-kit/core`/`lib/*` can never import a
   framework package directly. Vanilla adapters with no framework package (Web) need no such entry.

There's no `.dependency-cruiser.cjs` or `.ast-grep/` config in this repo (unlike `../pk`) — the
boundaries plugin above is the whole cross-package enforcement mechanism here.

---

## What core provides (never reimplement)

| Concern                   | How to access                                                                |
| ------------------------- | ---------------------------------------------------------------------------- |
| Variant resolution        | `createPolymorphic` → `runtime.resolveClasses`                               |
| Tag resolution            | `runtime.resolveTag`                                                         |
| Default prop merging      | `runtime.resolveProps`                                                       |
| Prop normalization        | `resolveNormalizedProps` (from `@praxis-kit/adapter-utils`)                  |
| ARIA role normalization   | `runtime.resolveAria(tag, props, normalizedProps)` — no-op when not enforced |
| Child structure contracts | `ChildrenEvaluator` via `buildEngines` from adapter-utils                    |
| Built-in HTML child rules | `runtime.options.htmlChildrenEvaluatorFn`                                    |
| Prop filter composition   | `composeFilter` / `applyFilter` from `@praxis-kit/adapter-utils`             |
| Core runtime wiring       | `buildCoreRuntime` from `@praxis-kit/adapter-utils`                          |

---

## What adapters own

| Concern                        | Where it lives                                                                |
| ------------------------------ | ----------------------------------------------------------------------------- |
| Ref handling                   | Adapter render path (VDOM only — no concept on Lit/Web/Svelte)                |
| `asChild` / slot merging       | Adapter slot module (VDOM only)                                               |
| Reactive memo wrapping         | Adapter render path (Solid)                                                   |
| Framework intrinsic prop types | `PolymorphicProps<G>` (VDOM only)                                             |
| SSR entry point                | Per-adapter SSR test; `renderContractToString` + `registerForSsr` for Lit/Web |
| `FrameworkFactoryOptions`      | Adapter options type                                                          |
| Attribute diffing              | `diffAndApplyAttributes` (Lit/Web only — no VDOM to diff against)             |

---

## Confirmed invariants

These properties have held across all seven adapters and can be relied upon when writing a new one:

- **Core is immutable across adapters.** No adapter has required a change to `@praxis-kit/core`. If
  you need to modify core for your adapter, the contract boundary is in the wrong place.
- **`filterProps` is the only VDOM-adapter-level extension.** No other per-framework field has been
  needed beyond it and React's `slotComponent`.
- **`OmitIndexSignature` on `VariantProps` is always required** in typed component surfaces. The
  default `VariantMap` expands to an index signature that pollutes all downstream prop types.
- **`ChildrenEvaluator` requires inspectable children.** Frameworks that pass children as opaque
  values (Svelte snippets, Solid signals without explicit child arrays) cannot evaluate structural
  contracts at render time. Document this limitation explicitly rather than silently skipping it.
- **SSR requires matching resolve conditions.** If the framework ships split browser/server builds
  (Solid's `solid-js/web`), a separate vitest config with the correct `conditions` is required.
- **`options.tag` is the semantic model, never assume it's the DOM host.** True for every adapter,
  but only observable as a real distinction on Lit/Web, where the two can genuinely differ. A new
  Custom-Element-style adapter should treat this as load-bearing from day one, not discover it later
  the way this repo did.
