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

Pass `asChild` with a render-prop function as `children` — unlike React/Vue's clone-onto-a-single-
child-element model, Solid's `asChild` hands the fully resolved DOM props (class, ARIA role, ref, …)
to a function you call yourself, so _you_ decide what element renders them:

```tsx
<Button asChild>{(props) => <a href="/home" {...props} />}</Button>
```

`children` that isn't a function throws (`SlotValidator.assertRenderFn`).

---

## Exports

| Export                    | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| `createContractComponent` | Factory: styling + ARIA enforcement + children validation           |
| `defineContractComponent` | Curries a factory's options so multiple call sites share one config |
