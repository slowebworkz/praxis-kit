# @praxis-kit/solid

SolidJS adapter for praxis-kit — polymorphic components with ARIA contracts, variant composition,
and structural child validation.

---

## Installation

```bash
pnpm add @praxis-kit/solid
```

SolidJS is a peer dependency:

```bash
pnpm add solid-js
```

---

## Usage

```ts
import { createContractComponent } from '@praxis-kit/solid'

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

The returned component is a standard Solid component. Pass `as` to change the rendered element:

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

| Export                            | Description                                                    |
| --------------------------------- | -------------------------------------------------------------- |
| `createContractComponent`         | Full factory: styling + ARIA enforcement + children validation |
| `createPolymorphicComponent`      | Styling only, no enforcement                                   |
| `createAriaEnforcedComponent`     | Styling + ARIA enforcement, no children validation             |
| `createChildrenEnforcedComponent` | Styling + children validation, no ARIA                         |
