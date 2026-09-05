# @praxis-kit/lit

Lit adapter for praxis-kit — polymorphic custom elements with ARIA contracts, variant composition,
and structural child validation.

---

## Installation

```bash
pnpm add @praxis-kit/lit
```

Lit is a peer dependency:

```bash
pnpm add lit
```

---

## Usage

```ts
import { createContractComponent } from '@praxis-kit/lit'

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

Unlike the other adapters, `createContractComponent` returns a **Lit custom-element class**, not a
JSX-usable component — register it yourself with `customElements.define()`. Variants and the
built-in fields (`as`, `recipe`, `praxis-class`) are all plain HTML attributes; there's no props
object to spread.

This adapter targets **Light DOM composition only** — `createRenderRoot()` returns `this`, so Shadow
DOM styling (`::slotted`, etc.) and the Shadow DOM slot protocol are intentionally out of scope.

Two differences from the other adapters, both consequences of the custom-element model rather than
bugs:

- **No `as` — no tag polymorphism at all.** A custom element's tag is fixed at
  `customElements.define()` time; nothing at render time can turn a `<praxis-button>` into an `<a>`.
  Setting an `as` attribute has no effect (it's filtered out before it reaches the pipeline, on both
  the DOM and SSR paths) rather than silently reinterpreting semantics for a tag the element will
  never actually be — matches `capabilities.tagPolymorphism: false` in the conformance suite. Need
  different semantics for one case? Register a second component with a different `tag`, or set
  `role` directly.
- **Variant attributes stay on the host.** Lit's reactive property system reflects them as real DOM
  attributes (`size="lg"`), unlike React/Vue where they're consumed and stripped before reaching the
  DOM.

`asChild` is not available on this adapter — Light DOM has no JSX-style slot to clone props onto.

---

## Exports

| Export                        | Description                                                         |
| ----------------------------- | ------------------------------------------------------------------- |
| `createContractComponent`     | Factory: styling + ARIA enforcement + children validation           |
| `defineContractComponent`     | Curries a factory's options so multiple call sites share one config |
| `renderToString`              | SSR string rendering                                                |
| `LitFactoryOptions` (type)    | Factory options with Lit-specific extensions                        |
| `LitContractComponent` (type) | Return type of the factory                                          |
| `ContractProps<T>` (type)     | A built component's full prop contract, recovered from `typeof X`   |
| `GenericsOf<T>` (type)        | Recovers the `PolymorphicGenerics` a component was built from       |
