# praxis-kit (packages/kit)

The **single published package**. Everything users install comes from here; every other workspace in
the repo is private and gets bundled into this package's entry points at build time.

```bash
pnpm add praxis-kit
```

## Status

Built (`tsdown`). The public `exports` surface, the framework-neutral entry files (`contract.ts` /
`guards.ts` / `html.ts` / `utils.ts` — thin re-exports of `@praxis-kit/core`, `primitive`, and
`diagnostics`), and Changesets (this is the only package it versions) are all in place. All 7
framework adapters are ready, including Solid and Svelte's declaration file — both formerly deferred
gaps, now resolved (see below). **Published as `praxis-kit@0.1.1`.** The CI release gate and npm
publish workflow are in place; see [`docs/releasing/verify-release.md`](../../docs/releasing/verify-release.md)
for the checks that precede a release.

| Entry                                     | Bundles                    | State                                                                                                                     |
| ----------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `praxis-kit/react` (+ `/react/legacy`)    | `adapters/react`           | ✅ ready                                                                                                                  |
| `praxis-kit/preact`                       | `adapters/preact`          | ✅ ready                                                                                                                  |
| `praxis-kit/vue`                          | `adapters/vue`             | ✅ ready                                                                                                                  |
| `praxis-kit/solid`                        | `adapters/solid`           | ✅ ready — real Solid JSX transform via `unplugin-solid/rolldown`                                                         |
| `praxis-kit/svelte`                       | `adapters/svelte`          | ✅ ready — declarations generate correctly as of `rolldown-plugin-dts@^0.28.5` (via tsdown 0.23.0)                        |
| `praxis-kit/lit`                          | `adapters/lit`             | ✅ ready                                                                                                                  |
| `praxis-kit/web`                          | `adapters/web`             | ✅ ready                                                                                                                  |
| `praxis-kit/tailwind` (+ `.css`)          | `lib/tailwind`             | ✅ ready                                                                                                                  |
| `praxis-kit/eslint`                       | `plugins/eslint`           | ✅ ready                                                                                                                  |
| `praxis-kit/ts-plugin`                    | `plugins/typescript` (CJS) | ✅ ready                                                                                                                  |
| `praxis-kit/vite-plugin`                  | `plugins/vite`             | ✅ ready — requires the consumer's own `typescript` at runtime (real `import ts from 'typescript'`, not a build artifact) |
| `praxis-kit/codemod`                      | `tooling/codemod`          | ✅ ready — fully self-contained; `ts-morph` vendors its own TypeScript, no peer needed                                    |
| `praxis-kit/{contract,guards,html,utils}` | this folder                | ✅ ready                                                                                                                  |

## Formerly-deferred gaps, now resolved

- **Solid.** No rolldown-native Solid JSX transform was known to exist in this workspace when this
  build was first written. `unplugin-solid/rolldown` (backed by `babel-preset-solid`, the same
  compiler `esbuild-plugin-solid` wraps for `../pk`'s tsup build) fills that gap — confirmed via
  tsdown's own documented Solid recipe.
- **Svelte's type declarations.** `svelte`'s own shipped types use an ambient
  `declare module 'svelte' { ... }` augmentation rather than plain top-level `export`s, which
  `rolldown-plugin-dts@0.27.x` couldn't bundle through. Fixed upstream in
  `rolldown-plugin-dts@^0.28.5` ("treat script-style ambient declarations as modules"), pulled in
  via a `tsdown` bump to `0.23.0`.

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

Framework packages (`react`, `vue`, `preact`, `solid-js`, `lit`, `svelte`) stay optional peer
dependencies. `typescript` is an optional peer too, for `vite-plugin` specifically — `codemod` needs
none (see above), and no other entry touches it.

## Verifying a release candidate

`publint` and a workspace typecheck check `dist/` shape and source types — neither installs the
published package the way a real consumer would. `pnpm --filter praxis-kit test:pack` does: builds
fresh, packs, installs the tarball plus every framework peer into an isolated fixture (outside this
repo's own pnpm workspace, so nothing resolves via hoisting), imports every plain-JS public entry,
resolves types for every typed entry, and runs `praxis-codemod` through its real `.bin` symlink —
the exact sequence that caught two real bugs no amount of `publint`/typecheck/lint surfaced (see
`DECISIONS.md`). Wired into `prepublishOnly`, so a real `npm publish` can't skip it.

See `DECISIONS.md` ("`packages/kit` — real build (tsup → tsdown)") for the full writeup, including
why this isn't a straight port of `../pk`'s `tsup` config.
