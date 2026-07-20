# praxis-kit (packages/kit)

The **single published package**. Everything users install comes from here; every other workspace in
the repo is private and gets bundled into this package's entry points at build time.

```bash
pnpm add praxis-kit
```

| Entry                                  | Bundles                     | Purpose                                                      |
| -------------------------------------- | --------------------------- | ------------------------------------------------------------ |
| `praxis-kit/react` (+ `/react/legacy`) | `adapters/react`            | React 19 adapter (18 via `/legacy`)                          |
| `praxis-kit/preact`                    | `adapters/preact`           | Preact adapter                                               |
| `praxis-kit/solid`                     | `adapters/solid`            | Solid adapter                                                |
| `praxis-kit/svelte`                    | `adapters/svelte`           | Svelte 5 adapter                                             |
| `praxis-kit/vue`                       | `adapters/vue`              | Vue 3 adapter                                                |
| `praxis-kit/lit`                       | `adapters/lit`              | Lit adapter                                                  |
| `praxis-kit/web`                       | `adapters/web`              | Vanilla Custom Elements adapter                              |
| `praxis-kit/tailwind`                  | `lib/tailwind`              | Layout-aware Tailwind class pipeline                         |
| `praxis-kit/tailwind.css`              | `lib/tailwind`              | Tailwind v4 safelist for runtime-assembled display classes   |
| `praxis-kit/contract`                  | `contract.ts` (this folder) | Framework-agnostic contracts, prop normalizers, shared types |
| `praxis-kit/utils`                     | `utils.ts` (this folder)    | General-purpose helpers (e.g. `memoize`)                     |
| `praxis-kit/eslint`                    | `plugins/eslint`            | ESLint rules                                                 |
| `praxis-kit/ts-plugin`                 | `plugins/typescript`        | TS language-service plugin (CJS)                             |
| `praxis-kit/vite-plugin`               | `plugins/vite`              | Vite plugins                                                 |
| `praxis-kit/codemod`                   | `tooling/codemod`           | Migration codemods (`praxis-codemod` bin)                    |

## Build

`pnpm build` runs `tsup` (one config per entry in [tsup.config.ts](tsup.config.ts)) followed by
[scripts/postbuild.mjs](scripts/postbuild.mjs). Two invariants the build enforces:

1. **No unpublished names in output.** JS is bundled via `noExternal`; declarations resolve
   `@praxis-kit/*` sources via the dts `paths` mappings. `publint` (`pnpm lint:pkg`) checks the
   packed result.
2. **Single `Diagnostics` identity.** `@praxis-kit/diagnostics` is built once into
   `dist/_shared/diagnostics.*` and imported by every entry via relative specifier (rewritten in
   postbuild). Classes with private members are nominally typed — bundling a copy per entry would
   make each entry's `Diagnostics` a different type and a different runtime class. The postbuild
   script fails the build if a second declaration ever appears.

Framework packages (react, vue, …) are optional peer dependencies — users install only the ones
their chosen entry needs.
