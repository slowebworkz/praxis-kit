# praxis-kit (packages/kit)

The **single published package**. Everything users install comes from here; every other workspace in
the repo is private and gets bundled into this package's entry points at build time.

```bash
pnpm add praxis-kit
```

## Status

Built (`tsdown`). The public `exports` surface, the framework-neutral entry files (`contract.ts` /
`guards.ts` / `html.ts` / `utils.ts` — thin re-exports of `@praxis-kit/core`, `primitive`, and
`diagnostics`), and Changesets (this is the only package it versions) are all in place. **Not yet
published** (`private: true`) — pending review of the build itself and the release-process wiring
(CI release job, `private: false` flip, first tag), not on any remaining source gap.

| Entry                                     | Bundles                    | State                                                                                                                     |
| ----------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `praxis-kit/react` (+ `/react/legacy`)    | `adapters/react`           | ✅ ready                                                                                                                  |
| `praxis-kit/preact`                       | `adapters/preact`          | ✅ ready                                                                                                                  |
| `praxis-kit/vue`                          | `adapters/vue`             | ✅ ready                                                                                                                  |
| `praxis-kit/lit`                          | `adapters/lit`             | ✅ ready                                                                                                                  |
| `praxis-kit/web`                          | `adapters/web`             | ✅ ready                                                                                                                  |
| `praxis-kit/tailwind` (+ `.css`)          | `lib/tailwind`             | ✅ ready                                                                                                                  |
| `praxis-kit/eslint`                       | `plugins/eslint`           | ✅ ready                                                                                                                  |
| `praxis-kit/ts-plugin`                    | `plugins/typescript` (CJS) | ✅ ready                                                                                                                  |
| `praxis-kit/vite-plugin`                  | `plugins/vite`             | ✅ ready — requires the consumer's own `typescript` at runtime (real `import ts from 'typescript'`, not a build artifact) |
| `praxis-kit/codemod`                      | `tooling/codemod`          | ✅ ready — fully self-contained; `ts-morph` vendors its own TypeScript, no peer needed                                    |
| `praxis-kit/{contract,guards,html,utils}` | this folder                | ✅ ready                                                                                                                  |
| `praxis-kit/svelte`                       | `adapters/svelte`          | 🟡 JS-only — `dist/svelte/index.d.ts` isn't generated yet (see below)                                                     |
| `praxis-kit/solid`                        | `adapters/solid`           | ⬜ not exported — no rolldown-native Solid JSX transform wired into this build yet                                        |

## Known gaps

- **Svelte ships without type declarations.** `svelte`'s own shipped types use an ambient
  `declare module 'svelte' { ... }` augmentation rather than plain top-level `export`s, which
  `rolldown-plugin-dts` can't bundle through (tried both its `oxc` and `tsc` resolver modes). The JS
  build itself is unaffected — `adapters/svelte`'s only `svelte` import is
  `import type { Snippet }`, erased at that level. Tracked in `DECISIONS.md`; not chased with a
  workaround rather than shipping something fragile.
- **Solid isn't part of the build.** `../pk`'s reference build compiles Solid's `.tsx` via
  `esbuild-plugin-solid`; no rolldown-native equivalent is wired into this workspace. Deferred
  rather than forced — see `DECISIONS.md`.

## Build

`tsdown.config.ts` (this folder) — one entry per published subpath, plus a shared
`_shared/diagnostics` chunk. Two invariants `scripts/postbuild.ts` enforces after the build:

1. **No unpublished names in output.** JS bundles internal `@praxis-kit/*` packages directly
   (`deps.neverBundle` opts out only each entry's framework peer and `@praxis-kit/diagnostics`);
   declarations resolve `@praxis-kit/*` sources via `dts.compilerOptions.paths`. `publint` checks
   the packed result (`pnpm lint:pkg`).
2. **Single `Diagnostics` identity.** `@praxis-kit/diagnostics` is built once into
   `dist/_shared/diagnostics.*` and every other entry's external `@praxis-kit/diagnostics` specifier
   is rewritten to a relative import into it — a class with private members bundled per entry would
   be a different type and a different runtime class in each.

Framework packages (`react`, `vue`, `preact`, `lit`, `svelte`) stay optional peer dependencies.
`typescript` is an optional peer too, for `vite-plugin` specifically — `codemod` needs none (see
above), and no other entry touches it.

## Verifying a release candidate

`publint` and a workspace typecheck check `dist/` shape and source types — neither installs the
published package the way a real consumer would. `pnpm --filter praxis-kit test:pack` does: builds
fresh, packs, installs the tarball plus every framework peer into an isolated fixture (outside this
repo's own pnpm workspace, so nothing resolves via hoisting), imports every plain-JS public entry,
and runs `praxis-codemod` through its real `.bin` symlink — the exact sequence that caught two real
bugs no amount of `publint`/typecheck/lint surfaced (see `DECISIONS.md`). Wired into
`prepublishOnly`, so a real `npm publish` can't skip it.

See `DECISIONS.md` ("`packages/kit` — real build (tsup → tsdown)") for the full writeup, including
why this isn't a straight port of `../pk`'s `tsup` config.
