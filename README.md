# polymorphic-ui

A framework-agnostic TypeScript library for polymorphic component behavior — tag resolution, prop
merging, variant-based class composition, child structural validation, and ARIA role enforcement.

The core has no dependency on any rendering framework, the DOM, or any CSS methodology. Framework
adapters consume the runtime API and handle rendering.

---

## Packages

| Package                                         | Description                                              |
| ----------------------------------------------- | -------------------------------------------------------- |
| [`@polymorphic-ui/core`](packages/core)         | Framework-agnostic runtime and type system               |
| [`@polymorphic-ui/tailwind`](packages/tailwind) | Tailwind-aware class pipeline with layout-mode filtering |

---

## Getting started

```bash
pnpm add @polymorphic-ui/core
```

### Create a runtime

```ts
import { createPolymorphic } from '@polymorphic-ui/core'

const runtime = createPolymorphic({
  defaultTag: 'button',
  baseClassName: 'btn',
  variants: {
    size: {
      sm: 'btn--sm',
      md: 'btn--md',
      lg: 'btn--lg',
    },
    intent: {
      primary: 'btn--primary',
      ghost: 'btn--ghost',
    },
  },
  defaultVariants: { size: 'md', intent: 'primary' },
})
```

### Use the runtime in a component

```ts
// Resolve which element to render
const tag = runtime.resolveTag(as) // as ?? 'button'

// Merge default props with consumer props
const merged = runtime.resolveProps(consumerProps) // defaultProps + props

// Compose the class string
const className = runtime.resolveClasses(
  tag,
  merged,
  consumerClassName, // optional extra classes
  variantKey, // optional preset key
)
```

---

## Core API

### `createPolymorphic(options)`

Creates a `PolymorphicRuntime` from a configuration object.

| Option             | Type                             | Description                                 |
| ------------------ | -------------------------------- | ------------------------------------------- |
| `defaultTag`       | `unknown`                        | Fallback element when no `as` prop is given |
| `baseClassName`    | `string`                         | Classes always present on the component     |
| `tagMap`           | `Record<string, string>`         | Extra classes per intrinsic tag             |
| `presetMap`        | `Record<string, Partial<Props>>` | Named prop presets (variant shortcuts)      |
| `variants`         | `VariantMap`                     | CVA variant definitions                     |
| `defaultVariants`  | `DefaultVariants<V>`             | Default active variant keys                 |
| `compoundVariants` | `CompoundVariant<V>[]`           | Multi-condition variant rules               |
| `strict`           | `false \| 'warn' \| 'throw'`     | Violation severity for validators           |

### `cva(base, config)`

A thin wrapper around `class-variance-authority` that normalizes output through `clsx`.

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

### `AriaValidator`

Validates ARIA role assignments against implicit landmark roles. Returns a new props object with the
offending `role` stripped when a violation occurs.

```ts
import { AriaValidator } from '@polymorphic-ui/core'

const validator = new AriaValidator('warn')
const safeProps = validator.validate(tag, props)
```

Covered rules:

- Redundant role — `<nav role="navigation">` strips the role
- Invalid override — `<nav role="region">` strips the role
- Standalone region — `<article role="region">` strips the role

---

## Class pipeline

`resolveClasses` joins `baseClassName`, tagMap additions, CVA variant output, and any consumer
`className` into a single class string via `clsx`.

For Tailwind-specific layout-aware filtering (dropping `flex-*` utilities when the active mode is
`grid`, and vice versa), use `@polymorphic-ui/tailwind`:

```ts
import { createTailwindPipeline } from '@polymorphic-ui/tailwind'

const pipeline = createTailwindPipeline({ baseClassName: 'flex flex-1 grid-cols-2' })
const cls = pipeline(tag, props, className, variantKey, 'flex')
// grid-cols-2 is dropped — not valid in flex mode
```

---

## Framework adapter pattern

A minimal adapter render function (pseudocode):

```
adapter render(as, props, className, variantKey, children):
  tag    = runtime.resolveTag(as)
  merged = runtime.resolveProps(props)
  cls    = runtime.resolveClasses(tag, merged, className, variantKey)
  safe   = ariaValidator.validate(tag, merged)
  flat   = framework.flattenChildren(children)  // adapter's responsibility
  evaluator.evaluate(flat)
  return framework.render(tag, { ...safe, className: cls }, children)
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

---

## License

MIT
