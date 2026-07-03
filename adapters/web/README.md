# @praxis-kit/web

Vanilla Custom Elements adapter for praxis-kit — framework-free polymorphic components with ARIA
contracts and structural child validation. Uses `@praxis-kit/runtime` for rendering instead of a
host framework.

Private workspace; ships to users as the `praxis-kit/web` entry of the published package.

---

## Usage

```ts
import { createContractComponent, defineContractComponent } from 'praxis-kit/web'

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
| `renderToString`              | SSR string rendering, no DOM required                              |
| `WebFactoryOptions` (type)    | Factory options with web-specific extensions                       |
| `WebContractComponent` (type) | Return type of the factory                                         |

No peer dependencies — this is the zero-framework path.

Development: `pnpm --filter @praxis-kit/web test` (includes an SSR suite), `typecheck`, `lint`.
