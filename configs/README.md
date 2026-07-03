# configs/

Shared configuration for the monorepo — not a workspace, just plain files imported by the root
configs and by individual workspaces.

| File                                                      | Purpose                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `base.ts` / `imports.ts` / `unicorn.ts` / `typescript.ts` | Composable ESLint flat-config fragments assembled by each workspace's `eslint.config.ts` |
| `architecture.ts`                                         | `eslint-plugin-boundaries` layer rules — enforces the `lib/` dependency direction        |
| `praxis-plugin.ts`                                        | ESLint wiring for the in-repo `@praxis-kit/eslint-plugin` rules                          |
| `vitest.base.ts`                                          | Shared Vitest defaults                                                                   |
| `tsconfig.react.json` / `.preact` / `.solid` / `.svelte`  | Framework-specific TypeScript settings extended by adapters and examples                 |
| `types.ts` / `*.d.ts`                                     | Types for the config fragments themselves                                                |

When adding a workspace, extend from these rather than duplicating rules; the architecture
boundaries in `architecture.ts` are the enforced source of truth for what may import what.
