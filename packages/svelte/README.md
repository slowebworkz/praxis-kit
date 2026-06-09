# @praxis-kit/svelte

Svelte 5 adapter for praxis-kit — polymorphic components with ARIA contracts, variant composition,
and structural child validation.

---

## Installation

```bash
pnpm add @praxis-kit/svelte
```

Svelte is a peer dependency:

```bash
pnpm add svelte
```

---

## Usage

```ts
import { createContractComponent } from '@praxis-kit/svelte'

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

The returned value is a Svelte component. Use it in a `.svelte` file:

```svelte
<script>
  import { Button } from './button.js'
</script>

<Button size="lg">Click me</Button>
<Button as="a" href="/home">Home</Button>
```

---

## Exports

| Export                            | Description                                                    |
| --------------------------------- | -------------------------------------------------------------- |
| `createContractComponent`         | Full factory: styling + ARIA enforcement + children validation |
| `createPolymorphicComponent`      | Styling only, no enforcement                                   |
| `createAriaEnforcedComponent`     | Styling + ARIA enforcement, no children validation             |
| `createChildrenEnforcedComponent` | Styling + children validation, no ARIA                         |
