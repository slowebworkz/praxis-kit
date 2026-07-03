# lib/

Internal implementation modules. Everything in this folder is a **private workspace** — never
published on its own. The published `praxis-kit` package bundles these modules via `packages/kit`;
`@praxis-kit/core` and the adapters compose them.

| Workspace        | Package                     | Purpose                                                                   |
| ---------------- | --------------------------- | ------------------------------------------------------------------------- |
| `primitive/`     | `@praxis-kit/primitive`     | Render primitive: tag resolution, prop merge, slot protocol types         |
| `contract/`      | `@praxis-kit/contract`      | Contract runtime: ARIA engine, children validator, strict mode            |
| `styling/`       | `@praxis-kit/styling`       | Styling runtime: variant resolver (CVA), class pipeline, plugin API       |
| `tailwind/`      | `@praxis-kit/tailwind`      | Tailwind integration: layout-aware class pipeline (`praxis-kit/tailwind`) |
| `diagnostics/`   | `@praxis-kit/diagnostics`   | Diagnostic policy engine: severity, codes, reporters, error collection    |
| `pipeline/`      | `@praxis-kit/pipeline`      | Generic multi-pass pipeline primitives (create/start/execute processors)  |
| `adapter-utils/` | `@praxis-kit/adapter-utils` | Shared adapter logic: `buildRuntime`, engines, prop filtering, testing    |
| `playwright/`    | `@praxis-kit/playwright`    | Playwright CT helpers for interaction suites (ARIA snapshots, axe, keys)  |

Dependency direction flows strictly upward — `primitive` ← `contract` ← `styling` ← `packages/core`
← `adapter-utils` ← adapters — and is enforced by `pnpm arch:validate` (dependency-cruiser) plus the
boundaries rules in [configs/architecture.ts](../configs/architecture.ts). See
[ARCHITECTURE.md](../ARCHITECTURE.md) for the full layer model.

> `style/` is an empty leftover directory (only a stray `node_modules`); the real workspace is
> `styling/`.
