# configs/

Shared configuration for the monorepo — not a workspace, just plain files imported by the root
configs and by individual workspaces.

| File                                                      | Purpose                                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `base.ts` / `imports.ts` / `unicorn.ts` / `typescript.ts` | Composable ESLint flat-config fragments assembled by each workspace's `eslint.config.ts`                |
| `architecture.ts`                                         | `eslint-plugin-boundaries` layer rules — enforces the `lib/` dependency direction                       |
| `vitest.base.ts`                                          | Shared Vitest defaults — `defineLibConfig(name, overrides?)`, used by each package's `vitest.config.ts` |
| `tsconfig.react.json` / `.preact` / `.solid` / `.svelte`  | Framework-specific TypeScript settings extended by adapters and examples                                |
| `types.ts`                                                | Types for the config fragments themselves                                                               |

When adding a workspace, extend from these rather than duplicating rules; the architecture
boundaries in `architecture.ts` are the enforced source of truth for what may import what.

Not yet ported from `../pk` (lands with the package it supports): `praxis-plugin.ts` (wiring for the
in-repo `@praxis-kit` ESLint plugin).
