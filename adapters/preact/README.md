# @praxis-kit/preact

Preact adapter for praxis-kit — polymorphic components with ARIA contracts, variant composition, and
structural child validation.

---

## Installation

```bash
pnpm add @praxis-kit/preact
```

Preact is a peer dependency:

```bash
pnpm add preact
```

---

## Usage

```ts
import { createContractComponent } from '@praxis-kit/preact'

const Button = createContractComponent({
  tag: 'button',
  name: 'Button',
  defaults: { type: 'button' },
  styling: {
    base: 'btn',
    variants: { size: { sm: 'btn--sm', lg: 'btn--lg' } },
    defaults: { size: 'md' },
  },
  enforcement: {
    strict: 'warn',
    aria: [{ rule: 'no-redundant-role' }],
  },
})
```

The returned component is a standard Preact component. Pass `as` to change the rendered element:

```tsx
<Button as="a" href="/home">
  Home
</Button>
```

Pass `asChild` to merge props onto the single child element:

```tsx
<Button asChild>
  <a href="/home">Home</a>
</Button>
```

---

## Exports

| Export                                                                                     | Description                                                         |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `createContractComponent`                                                                  | Factory: styling + ARIA enforcement + children validation           |
| `defineContractComponent`                                                                  | Curries a factory's options so multiple call sites share one config |
| `Slottable`                                                                                | Marks the composition target child for `asChild`                    |
| `PreactFactoryOptions` (type)                                                              | Factory options with Preact-specific extensions                     |
| `ContractProps<T, Mode>` (type)                                                            | A built component's prop contract, recovered from `typeof X`        |
| `PolymorphicComponent`, `PolymorphicProps`, `PolymorphicWithAsChild`, `ElementRef` (types) | Component / prop shapes for typing wrappers                         |
