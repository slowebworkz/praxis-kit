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
import { defineContract } from '@praxis-kit/adapter-utils'

export const buttonContract = defineContract({
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

const Button = createContractComponent(buttonContract)
```

`defineContract` pins the config object to its own concrete type before it reaches
`createContractComponent` — the same object works unchanged if you pass it to another adapter's
`createContractComponent` instead, and it's what lets `ContractProps<typeof Button>` (below) recover
the exact prop shape later. Skipping it and passing a plain object literal straight to
`createContractComponent` still works — `defineContract` is a naming/reuse convenience, not a
requirement.

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

| Export                                                                                     | Description                                                  |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `createContractComponent`                                                                  | Factory: styling + ARIA enforcement + children validation    |
| `Slottable`                                                                                | Marks the composition target child for `asChild`             |
| `PreactFactoryOptions` (type)                                                              | Factory options with Preact-specific extensions              |
| `ContractProps<T, Mode>` (type)                                                            | A built component's prop contract, recovered from `typeof X` |
| `PolymorphicComponent`, `PolymorphicProps`, `PolymorphicWithAsChild`, `ElementRef` (types) | Component / prop shapes for typing wrappers                  |
