# @praxis-kit/vue

Vue 3 adapter for praxis-kit — polymorphic components with ARIA contracts, variant composition, and
structural child validation.

---

## Installation

```bash
pnpm add @praxis-kit/vue
```

Vue is a peer dependency:

```bash
pnpm add vue
```

---

## Usage

```ts
import { createContractComponent } from '@praxis-kit/vue'

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

The returned value is a Vue component. Use it in a `.vue` file:

```vue
<script setup>
import { Button } from './button.js'
</script>

<template>
  <Button size="lg">Click me</Button>
  <Button as="a" href="/home">Home</Button>
</template>
```

Pass `asChild` to merge props onto the single child element:

```vue
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
