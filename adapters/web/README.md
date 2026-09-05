# @praxis-kit/web

Vanilla Custom Elements adapter for praxis-kit — framework-free polymorphic components with ARIA
contracts and structural child validation. No framework dependency, no `@praxis-kit/runtime` or any
other rendering library — a plain `HTMLElement` subclass.

---

## Installation

```bash
pnpm add @praxis-kit/web
```

No peer dependencies — this is the zero-framework path.

---

## Usage

```ts
import { createContractComponent } from '@praxis-kit/web'

const Button = createContractComponent({
  tag: 'button',
  name: 'Button',
  styling: {
    base: 'btn',
    variants: { size: { sm: 'btn--sm', lg: 'btn--lg' } },
    defaults: { size: 'sm' },
  },
  enforcement: { strict: 'warn' },
})

customElements.define('praxis-button', Button)
```

```html
<praxis-button size="lg">Click me</praxis-button>
```

The pipeline runs synchronously on `connectedCallback` and on every `attributeChangedCallback` for
praxis-owned attributes (variant keys, `variant-key`, `praxis-class`). For non-reactive attributes
(`aria-*`, `role`, `data-*`) — or a praxis-owned property set directly rather than via
`setAttribute` (property assignment alone never triggers a re-run) — call `element.update()`
afterward.

Two differences from the other adapters, both consequences of the custom-element model rather than
bugs — identical to the Lit adapter's, since both are fixed-identity custom elements sharing the
same underlying pipeline:

- **No `as` — no tag polymorphism at all.** A custom element's tag is fixed at
  `customElements.define()` time; nothing at render time can turn a `<praxis-button>` into an `<a>`.
  Setting an `as` attribute has no effect (filtered out before it reaches the pipeline, on both the
  DOM and SSR paths) rather than silently reinterpreting semantics for a tag the element will never
  actually be. Need different semantics for one case? Register a second component with a different
  `tag`, or set `role` directly.
- **Variant attributes stay on the host.** They're read from and reflected as real DOM attributes,
  unlike React/Vue where they're consumed and stripped before reaching the DOM.

`asChild` is not available on this adapter — Light DOM has no JSX-style slot to clone props onto.

---

## Exports

| Export                        | Description                                                         |
| ----------------------------- | ------------------------------------------------------------------- |
| `createContractComponent`     | Factory: styling + ARIA enforcement + children validation           |
| `defineContractComponent`     | Curries a factory's options so multiple call sites share one config |
| `renderToString`              | SSR string rendering, no DOM required                               |
| `WebFactoryOptions` (type)    | Factory options with web-specific extensions                        |
| `WebContractComponent` (type) | Return type of the factory                                          |
