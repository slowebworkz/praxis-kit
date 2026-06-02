# praxis-ui documentation

Framework-neutral UI infrastructure with enforceable structural and accessibility contracts.

## Contents

| Document                                     | What it covers                                      |
| -------------------------------------------- | --------------------------------------------------- |
| [Getting started](../GETTING_STARTED.md)     | Installation, first component, quick reference      |
| [Architecture](../ARCHITECTURE.md)           | Layer model, dependency graph, design decisions     |
| [Examples](./examples.md)                    | Runnable examples across all adapters               |
| [Concepts](./concepts.md)                    | Core abstractions: polymorphism, contracts, styling |
| [Adapter authoring](../ADAPTER_AUTHORING.md) | Building a new framework adapter                    |
| [Migration](../MIGRATING.md)                 | Breaking-change migration guide                     |
| [Changelog](../CHANGELOG.md)                 | Release history                                     |

## Layer overview

```
@praxis-ui/primitive   — tag resolution, prop merge
@praxis-ui/styling     — variant resolver, class pipeline
@praxis-ui/contract    — ARIA engine, children validator, strict mode
@praxis-ui/core        — re-export facade (primitive + styling + contract)

@praxis-ui/react       — React 18/19 adapter
@praxis-ui/vue         — Vue 3 adapter
@praxis-ui/preact      — Preact adapter
@praxis-ui/solid       — SolidJS adapter
@praxis-ui/svelte      — Svelte 5 adapter
```

## Quick start

```ts
import { createContractComponent } from '@praxis-ui/react'

const Button = createContractComponent({
  tag: 'button',
  defaults: { type: 'button' },
  styling: {
    base: 'inline-flex items-center rounded font-medium',
    variants: {
      intent: {
        primary: 'bg-blue-600 text-white',
        ghost: 'bg-transparent text-gray-600',
      },
    },
    defaults: { intent: 'primary' },
  },
})
```

Replace `@praxis-ui/react` with the adapter for your framework — the factory API is identical across
all adapters.
