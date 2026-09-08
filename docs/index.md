# praxis-kit documentation

Framework-neutral UI infrastructure with enforceable structural and accessibility contracts.

## Contents

| Document                                              | What it covers                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Getting started](../GETTING_STARTED.md)              | Installation, first component, quick reference                                                   |
| [Architecture](../ARCHITECTURE.md)                    | Layer model, dependency graph, runtime lifecycle                                                 |
| [Examples](./examples.md)                             | Where to see praxis-kit exercised end to end today                                               |
| [Concepts](./concepts.md)                             | Core abstractions: polymorphism, contracts, styling                                              |
| [Adapter authoring](../ADAPTER_AUTHORING.md)          | Building a new framework adapter                                                                 |
| [HTML/ARIA audit](./accessibility/html-aria-audit.md) | Normative source, rule, interpretation, test and deviation for every accessibility contract rule |
| [Release gate](./releasing/verify-release.md)         | What `pnpm verify:release` runs and why the order matters                                        |
| [Security policy](../SECURITY.md)                     | Supported versions, how to report a vulnerability                                                |

There is no `MIGRATING.md` or `CHANGELOG.md` yet — praxis-kit hasn't shipped a first published
version, so there is nothing to migrate from and no release history to log. Both will exist once
`praxis-kit@1.0.0` ships.

## Layer overview

praxis-kit publishes a **single** npm package — there is no separate `@praxis-kit/react`,
`@praxis-kit/core`, etc. to install. Everything under `@praxis-kit/*` is an internal workspace name
(`private: true`); what you actually `pnpm add` is `praxis-kit`, then import from the subpath for
what you need:

```text
praxis-kit                praxis-kit                — the framework-neutral children/guards/utils
                           /contract  /guards  /html  /utils  surface, no framework required

praxis-kit/react           React 19+ adapter          praxis-kit/react/legacy   React 18
praxis-kit/preact          Preact adapter
praxis-kit/vue             Vue 3 adapter
praxis-kit/solid           Solid adapter
praxis-kit/svelte          Svelte 5 adapter           (+ /svelte/Polymorphic.svelte)
praxis-kit/lit             Lit adapter
praxis-kit/web             Vanilla Custom Elements adapter

praxis-kit/tailwind        Tailwind layout-aware class pipeline    (+ /tailwind.css safelist)
praxis-kit/eslint          no-invalid-html-nesting and friends, as an ESLint plugin
praxis-kit/ts-plugin       TypeScript language-service plugin
praxis-kit/vite-plugin     Vite integration
praxis-kit/codemod         `praxis-codemod` CLI (also installed as a bin)
```

Internally, this one package is built from a much larger workspace — `packages/core` (the
capability-driven factory) sits on top of ten separate `lib/*` modules (tag/prop resolution, the
ARIA engine, the children validator, the class pipeline, the diagnostics/severity system, and the
cross-adapter runtime helpers), and each `adapters/<framework>/` directory consumes that layer
directly as workspace source. See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full layout and
dependency graph — none of it is a concern for someone just consuming `praxis-kit`.

## Quick start

```ts
import { createContractComponent } from 'praxis-kit/react'

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

Swap `praxis-kit/react` for the subpath matching your framework — the factory API is identical
across all seven adapters, with two small, documented exceptions on Lit and Web (no `as` prop; see
[GETTING_STARTED.md](../GETTING_STARTED.md#step-5--polymorphic-rendering)).
