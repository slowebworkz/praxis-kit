# @praxis-kit/lit

Lit adapter for praxis-kit — polymorphic custom elements with ARIA contracts, variant composition,
and structural child validation.

Private workspace; ships to users as the `praxis-kit/lit` entry of the published package.

---

## Usage

```ts
import { createContractComponent, defineContractComponent } from 'praxis-kit/lit'

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
```

## Exports

| Export                        | Description                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| `createContractComponent`     | Factory: styling + ARIA enforcement + children validation          |
| `defineContractComponent`     | Registers the component as a custom element (from `adapter-utils`) |
| `renderToString`              | SSR string rendering                                               |
| `LitFactoryOptions` (type)    | Factory options with Lit-specific extensions                       |
| `LitContractComponent` (type) | Return type of the factory                                         |

Lit ≥ 3 is a peer dependency of the published package when this entry is used.

Development: `pnpm --filter @praxis-kit/lit test` (includes an SSR suite), `typecheck`, `lint`.
