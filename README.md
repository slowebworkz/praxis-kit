# polymorphic-ui

Framework-neutral UI infrastructure with enforceable structural and accessibility contracts.

Build components that enforce correct ARIA roles, validate child structure, and compose safely
across tags and frameworks — all from a single declarative configuration.

---

## Packages

| Package                                         | Description                                                |
| ----------------------------------------------- | ---------------------------------------------------------- |
| [`@polymorphic-ui/core`](packages/core)         | Framework-agnostic runtime and type system                 |
| [`@polymorphic-ui/react`](packages/react)       | React adapter (React 19+); `/legacy` sub-path for React 18 |
| [`@polymorphic-ui/vue`](packages/vue)           | Vue 3 adapter                                              |
| [`@polymorphic-ui/tailwind`](packages/tailwind) | Tailwind layout-aware class pipeline plugin                |

---

## Quick start

```bash
pnpm add @polymorphic-ui/react @polymorphic-ui/core
```

### 1. A simple polymorphic component

```tsx
import { createPolymorphicComponent } from '@polymorphic-ui/react'

const Box = createPolymorphicComponent({ tag: 'div' })

// Renders <div>
<Box>content</Box>

// Renders <section> — same props, different tag
<Box as="section">content</Box>

// Renders child element directly, merging Box's resolved classes onto it
<Box asChild>
  <a href="/dashboard">Dashboard</a>
</Box>
```

### 2. Add scalable variants

```tsx
const Button = createPolymorphicComponent<'button', { loading?: boolean }>({
  tag: 'button',
  name: 'Button',
  styling: {
    base: 'btn',
    variants: {
      size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
      intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
    },
    defaults: { size: 'md', intent: 'primary' },
  },
  filterProps: (key, variantKeys) => variantKeys.has(key) || key === 'loading',
})

// Renders <button class="btn btn--md btn--primary">
<Button>Click me</Button>

// Renders <a class="btn btn--lg btn--ghost">
<Button as="a" href="/" size="lg" intent="ghost">Home</Button>
```

### 3. Accessibility enforcement

```tsx
const Landmark = createPolymorphicComponent({
  tag: 'nav',
  enforcement: { strict: 'warn' },
})

// Redundant role="navigation" is silently stripped — <nav> already implies it.
// With strict: 'warn' this surfaces a console warning at render time.
<Landmark role="navigation" />
```

### 4. Structural contracts

```tsx
import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { createPolymorphicComponent } from '@polymorphic-ui/react'
import { Button } from './button'

const ButtonGroup = createPolymorphicComponent({
  tag: 'div',
  styling: { base: 'inline-flex gap-2' },
  enforcement: {
    children: [
      {
        name: 'Button',
        match: (child): child is ReactElement =>
          isValidElement(child) && child.type === Button,
        cardinality: { min: 1, max: 4 },
      },
    ],
  },
})

// Throws at render if children are not 1–4 Button elements
<ButtonGroup>
  <Button>Save</Button>
  <Button intent="ghost">Cancel</Button>
</ButtonGroup>
```

### Prop types for consumers

```ts
import type { PolymorphicProps, ElementType } from '@polymorphic-ui/react'

type ButtonProps<TAs extends ElementType = 'button'> = PolymorphicProps<
  'button',
  { loading?: boolean },
  typeof variants,
  Record<never, never>,
  TAs
>
```

---

## React adapter

### `createPolymorphicComponent(options)`

Creates a React component from a `ReactFactoryOptions` configuration. Accepts all `FactoryOptions`
(see [Core API](#core-api)) plus React-specific fields:

| Option          | Type                            | Description                                                                      |
| --------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| `slotComponent` | `ComponentType`                 | Component used to render the `asChild` slot. Defaults to the built-in `Slot`.    |
| `filterProps`   | `(key, variantKeys) => boolean` | Return `true` for any prop that should be consumed but not forwarded to the DOM. |

The returned component accepts `as`, `asChild`, `className`, `variantKey`, and `ref` in addition to
component-defined props, variants, and the intrinsic HTML attributes of the resolved element.

### `asChild` — slot rendering

When `asChild` is `true`, the component merges its resolved props and class onto its single child
element instead of rendering its own DOM node.

```tsx
// Renders an <a>, not a <button>. Button's resolved className is merged onto the anchor.
<Button asChild>
  <a href="/dashboard">Dashboard</a>
</Button>
```

### `Slottable` — composing slot children

Use `Slottable` when the slot child needs to wrap additional content. The component merges onto the
element that contains `<Slottable>`, and `Slottable`'s children become the inner content.

```tsx
import { createPolymorphicComponent, Slottable } from '@polymorphic-ui/react'
;<Button asChild>
  <a href="/dashboard">
    <span aria-hidden>→</span>
    <Slottable>Dashboard</Slottable>
  </a>
</Button>
```

### Types

```ts
import type {
  PolymorphicProps, // prop surface for normal render (asChild?: false)
  PolymorphicWithAsChild, // prop surface for slot render (asChild: true, children: ReactElement)
  PolymorphicComponent, // callable component type with two overloads
  ElementRef, // infers the DOM instance type from a tag or component
} from '@polymorphic-ui/react'
```

`PolymorphicComponent` has two call signatures that discriminate on `asChild`:

- `asChild: true` — resolves to `PolymorphicWithAsChild`; one `ReactElement` child required
- `asChild?: false` — resolves to `PolymorphicProps`; `ReactNode` children accepted

### React 18

Import from the `/legacy` sub-path. The API is identical; the adapter wraps the component in
`forwardRef` for React 18 compatibility.

```ts
import { createPolymorphicComponent } from '@polymorphic-ui/react/legacy'
```

---

## Tailwind plugin

```bash
pnpm add @polymorphic-ui/tailwind
```

`createTailwindPipeline` returns a `ClassPlugin` that filters layout-specific Tailwind utilities
based on the active layout mode. Pass it as `styling.plugin` in factory options.

```tsx
import { createPolymorphicComponent } from '@polymorphic-ui/react'
import { createTailwindPipeline } from '@polymorphic-ui/tailwind'

const Box = createPolymorphicComponent({
  styling: {
    plugin: createTailwindPipeline,
    base: 'rounded p-4',
  },
})

// flex mode — grid-cols-* and row-* tokens stripped
<Box flex className="flex-col gap-4 grid-cols-3">...</Box>

// grid mode — flex-col, grow, shrink-* tokens stripped
<Box grid className="grid-cols-3 gap-4 flex-col">...</Box>

// no layout prop — class string passed through unchanged
<Box className="p-4 rounded">...</Box>
```

`LayoutProps` is `{ flex?: boolean; grid?: boolean }`. Include it in the component's `Props` type
parameter so callers can pass `flex` or `grid` as props. The plugin declares both keys as
`ownedKeys`, so the React adapter strips them before they reach the DOM.

---

## Core API

### `FactoryOptions`

All `createPolymorphicComponent` calls in both the React and Vue adapters accept a `FactoryOptions`
object. Options are organized into three zones:

**Identity** (top-level)

| Option     | Type             | Description                                                         |
| ---------- | ---------------- | ------------------------------------------------------------------- |
| `tag`      | `ElementType`    | Fallback element when no `as` prop is given. Defaults to `'div'`.   |
| `name`     | `string`         | Identifier used in error messages and dev tooling.                  |
| `defaults` | `Partial<Props>` | Prop values merged in before caller props. Caller wins on conflict. |

**`styling`** — class composition

| Option              | Type                                    | Description                                                                                                                |
| ------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `styling.base`      | `string`                                | Classes present on every render.                                                                                           |
| `styling.variants`  | `VariantMap`                            | CVA variant definitions.                                                                                                   |
| `styling.defaults`  | `Partial<VariantProps>`                 | Default variant state for each dimension.                                                                                  |
| `styling.compounds` | `CompoundVariant[]`                     | Conditional classes that activate when multiple variant conditions are simultaneously satisfied.                           |
| `styling.presets`   | `Record<string, Partial<VariantProps>>` | Named bundles of variant selections activated by `variantKey`.                                                             |
| `styling.tags`      | `Record<string, string>`                | Extra classes applied when the rendered tag matches a key.                                                                 |
| `styling.plugin`    | `ClassPluginFactory`                    | Replaces the built-in class pipeline. The plugin receives resolved options and may declare `ownedKeys` for prop stripping. |

**`enforcement`** — structural and accessibility contracts

| Option                 | Type                         | Description                                                      |
| ---------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `enforcement.strict`   | `false \| 'warn' \| 'throw'` | How violations are surfaced. Defaults to `'throw'`.              |
| `enforcement.aria`     | `AriaRule[]`                 | Custom ARIA validation rules extending the built-in role engine. |
| `enforcement.children` | `ChildRuleInput[]`           | Rules the component's children must satisfy on every render.     |

### `createPolymorphic(options)` — low-level runtime

Used directly when building a framework adapter. Most users should use `createPolymorphicComponent`
from the adapter package instead.

```ts
import { createPolymorphic } from '@polymorphic-ui/core'

const runtime = createPolymorphic({
  tag: 'button',
  styling: {
    base: 'btn',
    variants: { size: { sm: 'btn--sm', md: 'btn--md' } },
    defaults: { size: 'md' },
  },
})

const tag = runtime.resolveTag(as) // as ?? defaultTag
const merged = runtime.resolveProps(props) // defaults merged with props
const cls = runtime.resolveClasses(tag, merged, className, variantKey)
const { props: safeProps } = runtime.resolveAria(tag, merged) // strips invalid/redundant ARIA
```

### `AriaPolicyEngine`

Validates ARIA role assignments against implicit landmark roles and strips any invalid or redundant
`role` attribute.

```ts
import { AriaPolicyEngine } from '@polymorphic-ui/core'

const engine = new AriaPolicyEngine('warn')
const { props } = engine.validate(tag, elementProps)
```

Covered rules:

- **Redundant role** — `<nav role="navigation">` strips the role
- **Invalid override** — `<nav role="region">` strips the role
- **Standalone region** — `<article role="region">` strips the role

### `ChildrenEvaluator`

Enforces structural child rules against a flat `unknown[]` children array.

```ts
import { ChildrenEvaluator } from '@polymorphic-ui/core'

const evaluator = new ChildrenEvaluator(
  [
    { name: 'Header', match: (c) => c instanceof MyHeader, cardinality: { min: 1, max: 1 } },
    { name: 'Body', match: (c) => c instanceof MyBody, cardinality: { min: 1 } },
  ],
  'warn',
  'MyComponent',
)

evaluator.evaluate(flatChildren)
```

---

## Framework adapter pattern

A minimal adapter render function (pseudocode):

```
adapter render(as, props, className, variantKey, children):
  tag      = runtime.resolveTag(as)
  merged   = runtime.resolveProps(props)
  cls      = runtime.resolveClasses(tag, merged, className, variantKey)
  filtered = strip(merged, runtime.classPlugin?.ownedKeys, runtime.options.variantKeys)
  { props: safeProps } = ariaEngine.validate(tag, filtered)
  flat     = framework.flattenChildren(children)
  evaluator?.evaluate(flat)
  return framework.render(tag, { ...safeProps, className: cls }, children)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for a complete walkthrough of the internal pipeline, data
flow diagrams, and type system design. See [ADAPTER_AUTHORING.md](ADAPTER_AUTHORING.md) for a guide
to writing a new framework adapter against the core runtime contract.

---

## Why not X?

### Why not CVA directly?

[CVA](https://cva.style) is excellent at one thing: mapping variant keys to class strings. If class
composition is all you need, use it directly — this library wraps CVA internally and adds overhead
you don't want.

What CVA does not do:

- **Polymorphic rendering** — CVA produces a class string, not a component. You still wire up the
  `as` prop, tag resolution, and prop forwarding yourself.
- **ARIA normalization** — redundant or conflicting roles are your responsibility. CVA has no
  concept of the rendered element's semantics.
- **Structural contracts** — there is no mechanism to enforce which children are valid or how many
  are allowed. Violations surface at runtime as broken UI, not at component instantiation.
- **Prop filtering** — CVA variant keys pass through to the DOM unless you strip them manually on
  every call site.

`@polymorphic-ui/core` uses CVA for the variant resolution step and adds the surrounding
infrastructure: tag resolution, prop merging, class pipeline, ARIA normalization, child validation,
and the framework adapter contract. If you find yourself rebuilding those pieces on top of CVA, that
is the gap this library fills.

---

### Why not Radix Slot / `asChild`?

[Radix Slot](https://www.radix-ui.com/primitives/docs/utilities/slot) solves `asChild` — merging
props and refs onto a child element instead of rendering a wrapper tag. This library's `asChild`
implementation (React and Preact adapters) is directly modeled on Radix Slot.

What Radix Slot does not do:

- **Variant composition** — Slot handles prop merging; class string composition across variant
  dimensions is out of scope.
- **ARIA enforcement** — Slot forwards whatever props you give it. Role validation and redundancy
  stripping are not part of the contract.
- **Structural contracts** — Slot merges onto exactly one child. It does not validate what that
  child is or enforce cardinality rules across a set of children.
- **Framework neutrality** — Radix primitives are React-only. The same component contract cannot be
  expressed for Vue, Svelte, or Solid without rebuilding the primitives from scratch.

If you are using Radix UI components in a React app and want `asChild` behavior, Radix Slot is the
right tool. This library targets the layer above: defining and enforcing the structural contract
that governs what children are valid in the first place.

---

### Why not Chakra UI (or any full component library)?

Full component libraries like [Chakra UI](https://chakra-ui.com) ship pre-built components with
pre-decided semantics, styling conventions, and polymorphic behavior built in. That is a different
problem than this library solves.

What a component library does not give you:

- **Your own design system's constraints** — Chakra's Button enforces Chakra's rules. It cannot
  enforce that your `ButtonGroup` must contain 1–4 of _your_ `Button` components.
- **Framework portability** — Chakra is React-specific. Writing the same structural contract for a
  Vue or Svelte implementation means re-implementing the enforcement layer from scratch in each
  framework.
- **Composable runtime contracts** — Chakra's polymorphism is a convenience feature layered on top
  of pre-built components. It is not an open contract that you can apply to arbitrary component
  shapes.

This library is infrastructure, not a component library. It provides the enforcement, normalization,
and composition primitives that a design system's components are built on top of — in any framework.

---

## Development

```bash
pnpm install
pnpm typecheck    # type-check all packages
pnpm test         # run all tests
pnpm build        # build all packages
pnpm lint         # ESLint across workspace
pnpm format       # Prettier across workspace
```

Run any command within a package directory to scope it to that package.

---

## License

MIT
