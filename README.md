# polymorphic-ui

A TypeScript library for polymorphic component behavior — tag resolution, prop merging,
variant-based class composition, child structural validation, and ARIA role enforcement.

The core has no dependency on any rendering framework, the DOM, or any CSS methodology. Framework
adapters consume the runtime API and handle rendering.

---

## Packages

| Package                                         | Description                                                |
| ----------------------------------------------- | ---------------------------------------------------------- |
| [`@polymorphic-ui/core`](packages/core)         | Framework-agnostic runtime and type system                 |
| [`@polymorphic-ui/react`](packages/react)       | React adapter (React 19+); `/legacy` sub-path for React 18 |
| [`@polymorphic-ui/tailwind`](packages/tailwind) | Tailwind layout-aware class pipeline plugin                |

---

## Quick start

```bash
pnpm add @polymorphic-ui/react @polymorphic-ui/core
```

### Create a component

```tsx
import { createPolymorphicComponent } from '@polymorphic-ui/react'
import type { PolymorphicProps } from '@polymorphic-ui/react'

const Button = createPolymorphicComponent<'button', { loading?: boolean }>({
  defaultTag: 'button',
  baseClassName: 'btn',
  variants: {
    size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
    intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
  },
  defaultVariants: { size: 'md', intent: 'primary' },
})

// Renders as <button class="btn btn--md btn--primary">
<Button>Click me</Button>

// Renders as <a class="btn btn--lg btn--ghost">
<Button as="a" href="/" size="lg" intent="ghost">Home</Button>
```

### Prop types for consumers

```ts
// PolymorphicProps infers HTML attributes from the resolved `as` prop.
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

- `asChild: true` — resolves to `PolymorphicWithAsChild`; one or more `ReactElement` children
  required
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
based on the active layout mode. Pass it as `classPlugin` in factory options.

```tsx
import { createPolymorphicComponent } from '@polymorphic-ui/react'
import { createTailwindPipeline } from '@polymorphic-ui/tailwind'
import type { LayoutProps } from '@polymorphic-ui/tailwind'

const Box = createPolymorphicComponent<'div', LayoutProps>({
  classPlugin: createTailwindPipeline,
  baseClassName: 'rounded p-4',
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

### `createPolymorphic(options)`

Creates a `PolymorphicRuntime` from a configuration object. Used directly when building a framework
adapter; most React users should use `createPolymorphicComponent` instead.

```ts
import { createPolymorphic } from '@polymorphic-ui/core'

const runtime = createPolymorphic({
  defaultTag: 'button',
  baseClassName: 'btn',
  variants: { size: { sm: 'btn--sm', md: 'btn--md' } },
  defaultVariants: { size: 'md' },
})

const tag = runtime.resolveTag(as) // as ?? defaultTag
const merged = runtime.resolveProps(props) // defaultProps merged with props
const cls = runtime.resolveClasses(tag, merged, className, variantKey)
```

#### Options

| Option             | Type                                    | Description                                                                                                                |
| ------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `defaultTag`       | `ElementType`                           | Fallback element when no `as` prop is given. Defaults to `'div'`.                                                          |
| `baseClassName`    | `string`                                | Classes present on every render.                                                                                           |
| `defaultProps`     | `Partial<Props>`                        | Prop values merged in before caller props. Caller wins on conflict.                                                        |
| `tagMap`           | `Record<string, string>`                | Extra classes applied when the rendered tag matches a key. Skipped when a `variantKey` is active.                          |
| `presetMap`        | `Record<string, Partial<VariantProps>>` | Named bundles of variant selections activated by `variantKey`.                                                             |
| `variants`         | `VariantMap`                            | CVA variant definitions.                                                                                                   |
| `defaultVariants`  | `Partial<VariantProps>`                 | Default variant state for each dimension.                                                                                  |
| `compoundVariants` | `CompoundVariant[]`                     | Conditional classes that activate when multiple variant conditions are simultaneously satisfied.                           |
| `displayName`      | `string`                                | Identifier used in error messages and dev tooling.                                                                         |
| `strict`           | `false \| 'warn' \| 'throw'`            | How structural validation violations are surfaced. Defaults to `'throw'`.                                                  |
| `childRules`       | `ChildRuleInput[]`                      | Rules the component's children must satisfy on every render.                                                               |
| `classPlugin`      | `ClassPluginFactory`                    | Replaces the built-in class pipeline. The plugin receives resolved options and may declare `ownedKeys` for prop stripping. |

### `AriaPolicyEngine`

Validates ARIA role assignments against implicit landmark roles and returns a transformed props
object with any invalid `role` stripped.

```ts
import { AriaPolicyEngine } from '@polymorphic-ui/core'

const engine = new AriaPolicyEngine('warn')
const { props } = engine.validate(tag, elementProps)
// props has role stripped if it was invalid or redundant
```

Covered rules:

- **Redundant role** — `<nav role="navigation">` strips the role
- **Invalid override** — `<nav role="region">` strips the role
- **Standalone region** — `<article role="region">` strips the role

### `ChildrenEvaluator`

Enforces structural child rules against a flat `unknown[]` children array. Flattening framework
children into a plain array before calling `evaluate` is the adapter's responsibility.

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
flow diagrams, and type system design.

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
