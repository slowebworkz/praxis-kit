# Adapter Authoring Guide

This guide explains how to write a new framework adapter against the `@polymorphic-ui/core` runtime
contract. Five adapters currently exist — React, Vue, Preact, Solid, and Svelte — and each follows
the same boundary. Core required no changes for any of them.

---

## What an adapter does

An adapter connects the framework-agnostic core runtime to a specific framework's rendering model.
Its responsibilities are:

1. **Build the runtime** — call `createPolymorphic` with the user's factory options and wrap the
   result with an ARIA engine, child evaluator, and prop filter.
2. **Resolve the tag** — call `runtime.resolveTag(as)` to get the concrete element type for this
   render.
3. **Merge props** — call `runtime.resolveProps(rest)` to apply default props and preset merging.
4. **Resolve classes** — call `runtime.resolveClasses(tag, mergedProps, cls, variantKey)` to produce
   the final class string.
5. **Filter props** — strip variant keys and owned plugin keys before forwarding to the DOM.
6. **Normalize ARIA** — call `ariaEngine.validate(tag, elementProps)` on intrinsic (string) tags to
   remove redundant or invalid roles.
7. **Evaluate children** — call `childrenEvaluator.evaluate(children)` if present
   (framework-permitting — see constraints below).
8. **Render** — hand off the resolved tag, props, and children to the framework's own rendering
   primitive.

The core never touches the framework. The adapter never reimplements variant resolution, class
merging, ARIA rules, or child cardinality logic.

---

## Package structure

Follow the existing adapter layout:

```
packages/<framework>/
  src/
    build-runtime.ts              # normalizeOptions + buildRuntime
    compose-filter.ts             # composeFilter helper (copy verbatim)
    create-polymorphic-component.ts
    <framework>-options.ts        # FrameworkFactoryOptions type
    index.ts                      # public exports
    render.ts / render.tsx        # per-render logic (or embedded in .svelte)
    types/
      built-runtime.ts
      normalized-options.ts
      polymorphic-props.ts        # PolymorphicProps<G, TAs> (if applicable)
      primitives.ts
      props.ts
      render.ts
      runtime.ts
      index.ts
  package.json
  tsconfig.json
  vitest.config.ts
  vitest.ssr.config.ts            # if SSR requires separate conditions
  tsup.config.ts
  eslint.config.ts
```

---

## Step 1 — `build-runtime.ts`

This file is nearly identical across all adapters. Copy from an existing one and adjust the import
of `FrameworkFactoryOptions`.

```ts
import { AriaPolicyEngine, ChildrenEvaluator, createPolymorphic } from '@polymorphic-ui/core'
import { composeFilter } from './compose-filter'
import type { FrameworkFactoryOptions } from './framework-options'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { NormalizedOptions } from './types/normalized-options'

function normalizeOptions<G>(options): NormalizedOptions<G> {
  return {
    ...options,
    name: options.name ?? 'PolymorphicComponent',
    enforcement: {
      ...options.enforcement,
      strict: options.enforcement?.strict ?? 'throw',
    },
  }
}

export function buildRuntime(options): BuiltRuntime {
  const normalized = normalizeOptions(options)
  const runtime = createPolymorphic(normalized)
  const ownedKeys = 'classPlugin' in runtime ? runtime.classPlugin.ownedKeys : undefined
  const ariaEngine = new AriaPolicyEngine(normalized.enforcement.strict, ...)
  const childrenEvaluator = normalized.enforcement.children?.length
    ? new ChildrenEvaluator(normalized.enforcement.children, normalized.enforcement.strict)
    : undefined
  const filterProps = composeFilter(ownedKeys, normalized.filterProps)
  return { runtime, ariaEngine, filterProps, ...(childrenEvaluator && { childrenEvaluator }) }
}
```

The `strict` default is `'throw'`. This matches all existing adapters.

---

## Step 2 — `compose-filter.ts`

Copy this verbatim from any existing adapter. It combines the plugin's owned keys with the
user-supplied `filterProps` predicate into a single function.

```ts
import type { OwnedPropKeys } from '@polymorphic-ui/core'
import type { FilterPredicate } from './types'

export function composeFilter(
  ownedKeys: OwnedPropKeys | undefined,
  filterProps?: FilterPredicate,
): FilterPredicate {
  const defaultFilter: FilterPredicate = (key, variantKeys) =>
    variantKeys.has(key) || ownedKeys?.has(key) === true
  if (!filterProps) return defaultFilter
  return (key, variantKeys) => defaultFilter(key, variantKeys) || filterProps(key, variantKeys)
}
```

---

## Step 3 — the render path

This is where frameworks diverge most. The core sequence is the same; only the rendering primitive
changes.

### VDOM adapters (React, Preact, Vue)

```ts
// Pseudocode — see packages/react/src/render.tsx for the full version
export function render({ runtime, ariaEngine, filterProps, childrenEvaluator, props }) {
  const tag = runtime.resolveTag(props.as)
  const merged = runtime.resolveProps(rest) // rest = props minus as/class/variantKey/ref/children
  const cls = runtime.resolveClasses(tag, merged, props.class, props.variantKey)
  const filtered = applyFilter(merged, filterProps, runtime.options.variantKeys)
  const { role, ...domSafe } = filtered
  const elementProps = { ...domSafe, class: cls, ...(isKnownAriaRole(role) && { role }) }
  const finalProps =
    typeof tag === 'string' ? ariaEngine.validate(tag, elementProps).props : elementProps
  childrenEvaluator?.evaluate(toChildArray(props.children))
  return framework.createElement(tag, { ...finalProps, ref: props.ref }, props.children)
}
```

**React/Preact ref handling differs**:

- React 19+ (`current/`): `ref` is a plain prop — read from `props.ref`, pass as `ref` in the
  element props object.
- React 18 (`legacy/`): use `forwardRef`; read `element.ref` for slot access.
- Preact: same as React 19+ (ref is a plain prop in Preact 10+).

### Reactive adapters (Solid)

Solid requires `createMemo` / `$derived` wrappers around each resolution step so that DOM updates
are fine-grained rather than driven by full re-renders. `splitProps` is used instead of manual
destructuring to preserve Solid's reactivity through the prop boundary.

```ts
// Solid — see packages/solid/src/render.tsx
const [known, rest] = splitProps(props, SPLIT_KEYS)
const tag    = createMemo(() => runtime.resolveTag(known.as))
const merged = createMemo(() => runtime.resolveProps(rest))
const cls    = createMemo(() => runtime.resolveClasses(tag(), merged(), known.class, known.variantKey))
const dom    = createMemo(() => buildDomProps(applyFilter(merged(), ...), cls(), tag()))
return <Dynamic component={tag()} {...dom()} />
```

### Compile-time adapters (Svelte)

Svelte components must come from `.svelte` files (compiler constraint). `createPolymorphicComponent`
returns the `BuiltRuntime` bundle rather than a component function. The `.svelte` file receives it
as a `bundle` prop:

```svelte
<script lang="ts">
  let { bundle, as, class: cls, variantKey, children, ...rest } = $props()
  const tag         = $derived(bundle.runtime.resolveTag(as))
  const merged      = $derived(bundle.runtime.resolveProps(rest))
  const resolvedCls = $derived(bundle.runtime.resolveClasses(tag, merged, cls, variantKey))
  const filtered    = $derived(applyFilter(merged, bundle.filterProps, bundle.runtime.options.variantKeys))
  const domProps    = $derived(buildDomProps(filtered, resolvedCls, tag, bundle.ariaEngine))
</script>
<svelte:element this={tag} {...domProps}>{@render children?.()}</svelte:element>
```

Access `bundle.*` directly inside `$derived()` — do not destructure `bundle` at the top of the
script block, as Svelte will warn that the destructured values only capture the initial state.

---

## Step 4 — `PolymorphicProps<G, TAs>`

For VDOM adapters, define a typed component surface using the framework's element prop types. The
pattern across React, Preact, and Vue is:

```ts
type ControlProps<G, TAs extends ElementType> =
  PropsOf<G> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> &   // strips the [k: string]: string|undefined leak
  { as?: TAs; class?: ClassName; variantKey?: keyof PresetOf<G>; ref?: ... }

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

For Svelte, the props interface is defined directly in the `.svelte` file's `<script lang="ts">`
block and in a companion `.svelte.d.ts` declaration. `AnyBuiltRuntime` (the `bundle` prop type) uses
the structural `Runtime` supertype rather than `TypedRuntime<any>` to avoid a `classPlugin`
assignability issue from the tailwind overload.

---

## Step 5 — `FrameworkFactoryOptions`

Extend `FactoryOptions` from core with framework-specific additions. All current adapters add only
one field:

```ts
import type { FactoryOptions } from '@polymorphic-ui/core'

export type FrameworkFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> =
  FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & {
    filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
  }
```

`filterProps` is the only framework-level extension across all five adapters. No adapter has needed
to extend the core runtime contract itself.

---

## Step 6 — SSR

Every adapter needs an SSR smoke test verifying that server rendering does not access browser
globals and produces correct HTML.

**React**: `renderToString` from `react-dom/server`. **Vue**: `renderToString` from
`@vue/server-renderer`. **Preact**: `render` from `preact-render-to-string`. **Solid**:
`renderToString` from `solid-js/web` — requires a separate vitest config with
`conditions: ['development']` (no `'browser'`) so that `solid-js/web` resolves to its server build
rather than its browser build. **Svelte**: `render` from `svelte/server` — `vite-plugin-svelte`
produces universal output; no separate compile target required.

---

## Step 7 — ESLint config

Add a per-package `eslint.config.ts` that:

1. Spreads `base` and `ts` from `../../configs/`.
2. Adds a `no-restricted-imports` rule blocking all other adapter packages.

```ts
import base from '../../configs/base.js'
import ts from '../../configs/typescript.js'

export default [
  ...base,
  ...ts,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@polymorphic-ui/react', '@polymorphic-ui/vue' /* ... all other adapters */],
              message: '<framework> adapter must not import from other adapters',
            },
          ],
        },
      ],
    },
  },
]
```

Also add `@polymorphic-ui/<framework>` to every other adapter's restriction list, and add
`{ type: '<framework>', pattern: 'packages/<framework>/**/*' }` to `boundaries/elements` in
`configs/architecture.ts`.

---

## What core provides (never reimplement)

| Concern                   | Core export                                                 |
| ------------------------- | ----------------------------------------------------------- |
| Variant resolution        | `createPolymorphic` → `runtime.resolveClasses`              |
| Tag resolution            | `runtime.resolveTag`                                        |
| Default prop merging      | `runtime.resolveProps`                                      |
| ARIA role normalization   | `AriaPolicyEngine` → `.validate()`                          |
| Child structure contracts | `ChildrenEvaluator` → `.evaluate()`                         |
| Prop filter composition   | `OwnedPropKeys` + `composeFilter`                           |
| Strict mode behaviour     | `StrictBase` (via `AriaPolicyEngine` / `ChildrenEvaluator`) |

---

## What adapters own

| Concern                        | Where it lives        |
| ------------------------------ | --------------------- |
| Ref handling                   | Adapter render path   |
| `asChild` / slot merging       | Adapter slot module   |
| Reactive memo wrapping         | Adapter render path   |
| Framework intrinsic prop types | `PolymorphicProps<G>` |
| SSR entry point                | Per-adapter SSR test  |
| `FrameworkFactoryOptions`      | Adapter options type  |

---

## Confirmed invariants

These properties have held across all five adapters and can be relied upon when writing a new one:

- **Core is immutable across adapters.** No adapter has required a change to `@polymorphic-ui/core`.
  If you need to modify core for your adapter, the contract boundary is in the wrong place.
- **`filterProps` is the only adapter-level extension.** No other per-framework field has been
  needed.
- **`OmitIndexSignature` on `VariantProps` is always required** in typed component surfaces. The
  default `VariantMap` expands to an index signature that pollutes all downstream prop types.
- **`ChildrenEvaluator` requires inspectable children.** Frameworks that pass children as opaque
  values (Svelte snippets, Solid signals without explicit child arrays) cannot evaluate structural
  contracts at render time. Document this limitation explicitly rather than silently skipping it.
- **SSR requires matching resolve conditions.** If the framework ships split browser/server builds
  (Solid's `solid-js/web`), a separate vitest config with the correct `conditions` is required.
  Svelte 5's universal output is the exception.
