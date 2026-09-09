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

| Export                                                                                         | Description                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `createContractComponent`                                                                      | Factory: styling + ARIA enforcement + children validation           |
| `defineContractComponent`                                                                      | Curries a factory's options so multiple call sites share one config |
| `Slottable`                                                                                    | Marks the composition target child for `asChild`                    |
| `VueFactoryOptions` (type)                                                                     | Factory options with Vue-specific extensions                        |
| `ContractProps<T, Mode>` (type)                                                                | A built component's prop contract, recovered from `typeof X`        |
| `PolymorphicComponent`, `PolymorphicProps`, `PolymorphicWithAsChild`, `SlottableProps` (types) | Component / prop shapes for typing wrappers                         |
