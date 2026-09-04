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
// button.ts
import { createContractComponent } from '@praxis-kit/svelte'

export const buttonBundle = createContractComponent({
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

Unlike the other adapters, **`createContractComponent` returns a plain bundle, not a component** —
Svelte components must come from `.svelte` files, a compile-time constraint. Render the bundle
through the shared `<Polymorphic>` component instead:

```svelte
<!-- Button.svelte -->
<script lang="ts">
  import Polymorphic from '@praxis-kit/svelte/Polymorphic.svelte'
  import { buttonBundle } from './button'
</script>

<Polymorphic bundle={buttonBundle} size="lg">Click me</Polymorphic>
<Polymorphic bundle={buttonBundle} as="a" href="/home">Home</Polymorphic>
```

Pass `asChild` with a snippet as `children` to render it instead of the host element, receiving the
fully resolved props:

```svelte
<Polymorphic bundle={buttonBundle} asChild>
  {#snippet children(props)}
    <a href="/home" {...props}>Home</a>
  {/snippet}
</Polymorphic>
```

`<Polymorphic>` is intentionally **generic-erased** at the component boundary — one physical
`.svelte` file serves every bundle's variants/props shape, so its own `children` type can't be
`Polymorphic<G1>` vs. `Polymorphic<G2>` per call site the way a generic React component can be.
Bundle-specific prop precision is recovered on your side of the boundary instead, by typing your
snippet's parameter explicitly:

```ts
{#snippet children(props: ResolvedSlotProps<GenericsOf<typeof buttonBundle>>)}
```

---

## Exports

| Export                    | Description                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `createContractComponent` | Factory: styling + ARIA enforcement + children validation — returns a bundle, not a component     |
| `defineContractComponent` | Curries a factory's options so multiple call sites share one config                               |
| `./Polymorphic.svelte`    | The component every bundle renders through (separate subpath — a `.svelte` file, not a JS export) |
