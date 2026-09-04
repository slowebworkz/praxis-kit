# praxis-kit (packages/kit)

The **single published package**. Everything users install comes from here; every other workspace in
the repo is private and gets bundled into this package's entry points at build time.

```bash
pnpm add praxis-kit
```

## Status

Scaffold only. The public `exports` surface and the framework-neutral entry files (`contract.ts` /
`guards.ts` / `html.ts` / `utils.ts` — thin re-exports of `@praxis-kit/core`, `primitive`, and
`diagnostics`) are in place, and Changesets is configured (this is the only package it versions).
**Not yet published** (`private: true`): the build and the first `v1.0.0` release are gated on the
remaining adapters (`solid`, `svelte`, `lit`, `web`) and `tooling/codemod` landing — the `exports`
map and the `../pk` `tsup` config both reference them.

| Entry                                     | Bundles                    | State      |
| ----------------------------------------- | -------------------------- | ---------- |
| `praxis-kit/react` (+ `/react/legacy`)    | `adapters/react`           | ✅ source  |
| `praxis-kit/preact`                       | `adapters/preact`          | ✅ source  |
| `praxis-kit/vue`                          | `adapters/vue`             | ✅ source  |
| `praxis-kit/tailwind` (+ `.css`)          | `lib/tailwind`             | ✅ source  |
| `praxis-kit/eslint`                       | `plugins/eslint`           | ✅ source  |
| `praxis-kit/ts-plugin`                    | `plugins/typescript` (CJS) | ✅ source  |
| `praxis-kit/vite-plugin`                  | `plugins/vite`             | ✅ source  |
| `praxis-kit/{contract,guards,html,utils}` | this folder                | ✅ source  |
| `praxis-kit/{solid,svelte,lit,web}`       | `adapters/*`               | ⬜ pending |
| `praxis-kit/codemod`                      | `tooling/codemod`          | ⬜ pending |

## Build (not yet ported)

`../pk`'s build is `tsup` (~20 per-entry configs) + a `postbuild` script enforcing two invariants
that must carry over:

1. **No unpublished names in output.** JS bundled via `noExternal`; declarations resolve
   `@praxis-kit/*` sources via dts `paths` mappings. `publint` checks the packed result.
2. **Single `Diagnostics` identity.** `@praxis-kit/diagnostics` is built once into
   `dist/_shared/diagnostics.*` and imported by every entry via relative specifier — a class with
   private members bundled per entry would be a different type and a different runtime class in
   each.

The port converts this to `tsdown` (the repo standard) once all entries have source. Framework
packages stay optional peer dependencies.
