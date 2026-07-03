# adapters/

Framework adapters — one workspace per rendering environment. Each adapter connects the
framework-agnostic core runtime (`@praxis-kit/core`) to a specific framework's rendering model:
component creation, ref handling, children normalization, and the `asChild` slot protocol.

All adapters are **private workspaces**. They are bundled into the published `praxis-kit` package by
`packages/kit` and reach users as subpath exports (`praxis-kit/react`, `praxis-kit/vue`, …).

| Workspace | Package              | Target                                   |
| --------- | -------------------- | ---------------------------------------- |
| `react/`  | `@praxis-kit/react`  | React 19 (root entry) and 18 (`/legacy`) |
| `preact/` | `@praxis-kit/preact` | Preact ≥ 10.11                           |
| `solid/`  | `@praxis-kit/solid`  | SolidJS ≥ 1.6                            |
| `svelte/` | `@praxis-kit/svelte` | Svelte 5                                 |
| `vue/`    | `@praxis-kit/vue`    | Vue 3                                    |
| `lit/`    | `@praxis-kit/lit`    | Lit ≥ 3                                  |
| `web/`    | `@praxis-kit/web`    | Vanilla Custom Elements, no framework    |

Every adapter exposes the same factory API (`createContractComponent` and its capability-scoped
variants) and follows the same boundary: it calls `buildRuntime` from `@praxis-kit/adapter-utils`
and delegates all contract logic to core. Writing a new adapter is documented in
[ADAPTER_AUTHORING.md](../ADAPTER_AUTHORING.md) — core has required no changes for any adapter so
far, and that is the bar for new ones.

Each adapter has a matching example app under [examples/](../examples/) exercising Box, Button, and
Tabs against it.
