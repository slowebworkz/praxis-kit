import { resolve as resolvePath, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'
import rootPaths from '../../tsconfig.paths.json' with { type: 'json' }
import type { StringMap } from '@praxis-kit/primitive'

// tsdown loads this config as a native ESM module (no esbuild/CJS shim the way tsup provided one),
// so `__dirname` isn't available — derive it the same way postbuild.ts does.
const __dirname = dirname(fileURLToPath(import.meta.url))

// tsdown's default (no `deps` config at all) bundles every reachable import, workspace packages
// included — confirmed empirically against `../pk`'s own already-built tsup output (its
// dist/preact/index.js inlines lib/contract, lib/styling, etc. directly, by source-comment
// evidence), so no `alwaysBundle`/`alias` allowlist is needed here: every internal
// `@praxis-kit/*` package this reaches (adapter-utils, core, primitive, contract, styling,
// runtime — whichever a given entry's import graph actually touches) bundles in by default,
// exactly like tsup's default did.
//
// Two things must be pulled back OUT of that default, per entry:
// - `@praxis-kit/diagnostics`, everywhere. Its class has private members, so each inlined copy
//   would be nominally distinct at both the type and runtime level (a separate
//   `declare class Diagnostics` per d.ts, a separate class per JS bundle) — an assignability break
//   for consumers passing a Diagnostics instance between, say, `praxis-kit/react` and
//   `praxis-kit/contract`. Instead it's built once into dist/_shared/diagnostics.* below, and
//   postbuild.ts rewrites the external specifier to a relative path into it.
// - Each entry's own framework peer (`react`, `preact`, `vue`, `lit`) and everything that peer
//   itself resolves under its own scope (`react/jsx-runtime`, `@lit/reactive-element`, `lit-html`,
//   `lit-element`, `@lit-labs/*`, …). Confirmed necessary the hard way: a first pass here with no
//   `neverBundle` at all silently inlined `lit` and its whole dependency tree straight into
//   `dist/lit/index.js`, which would have broken the peer-dependency contract (consumers must
//   bring their own single `lit` instance — a bundled copy duplicates its custom-element registry).
const diagnostics = '@praxis-kit/diagnostics'

// tsdown's `dts.compilerOptions.paths` needs absolute values — the root tsconfig.paths.json values
// are relative to the repo root, not to packages/kit (where tsdown resolves `dts.tsconfig` from).
const ROOT = resolvePath(__dirname, '../..')

const dtsPaths: StringMap<string[]> = Object.fromEntries(
  Object.entries(rootPaths.compilerOptions.paths).map(([key, values]) => [
    key,
    (values as string[]).map((rel) => resolvePath(ROOT, rel)),
  ]),
)

// Fresh object per entry — tsdown/rolldown-plugin-dts may mutate the options object it receives.
const dts = () => ({
  compilerOptions: { baseUrl: ROOT, paths: dtsPaths },
})

export default defineConfig([
  // Shared diagnostics chunk — single runtime module + single d.ts declaration, referenced by
  // every other entry via a relative specifier rewritten in postbuild.ts. No framework peer, no
  // problematic npm dep on its own import graph, so nothing needs externalizing here.
  {
    entry: { '_shared/diagnostics': '../../lib/diagnostics/src/index.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: '../../tsconfig.base.json',
    fixedExtension: false,
  },

  // React — current (index) + legacy entry.
  {
    entry: {
      'react/index': '../../adapters/react/src/index.ts',
      'react/legacy': '../../adapters/react/src/legacy/index.ts',
    },
    format: ['esm'],
    dts: dts(),
    tsconfig: '../../adapters/react/tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics, 'react', 'react-dom', /^react\//, /^react-dom\//] },
  },

  // Preact
  {
    entry: { 'preact/index': '../../adapters/preact/src/index.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: '../../adapters/preact/tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics, 'preact', /^preact\//] },
  },

  // Vue
  {
    entry: { 'vue/index': '../../adapters/vue/src/index.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: '../../adapters/vue/tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics, 'vue', /^vue\//] },
  },

  // Lit
  {
    entry: { 'lit/index': '../../adapters/lit/src/index.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: '../../adapters/lit/tsconfig.json',
    fixedExtension: false,
    deps: {
      neverBundle: [diagnostics, 'lit', /^lit\//, /^lit-/, /^@lit\//, /^@lit-labs\//],
    },
  },

  // Svelte — the adapter's own entry is plain `.ts` (only `import type { Snippet } from 'svelte'`,
  // erased at the JS level, so `svelte` needs no runtime externalizing here). `Polymorphic.svelte`
  // is *not* compiled by this bundler at all — it's raw `.svelte` source, consumed by the
  // *consumer's own* Svelte compiler at their build time, so postbuild.ts copies it into
  // dist/svelte/ byte-for-byte (matching how `@praxis-kit/svelte` itself re-exports it).
  {
    entry: { 'svelte/index': '../../adapters/svelte/src/index.ts' },
    format: ['esm'],
    // KNOWN GAP, not a config bug: `dts` is disabled for this entry only. `svelte`'s own shipped
    // types use `declare module 'svelte' { ... }` ambient-module-augmentation style rather than
    // plain top-level `export`s. rolldown-plugin-dts (both its `oxc` and `tsc` resolver modes —
    // both tried) bundles declarations by statically binding re-exports through rolldown's own
    // linker, which doesn't resolve an ambient `declare module` re-export
    // (`[MISSING_EXPORT] "Snippet" is not exported by .../svelte/types/index.d.ts`, even though
    // `Snippet` is genuinely declared there). `rollup-plugin-dts` (what tsup/pk's build used)
    // handles this package shape natively; rolldown-plugin-dts does not yet, and exposes no
    // external/opaque-module escape hatch for it. The JS build is unaffected (the `Snippet` import
    // is `import type`, erased at that level) — only `dist/svelte/index.d.ts` is missing until this
    // is resolved upstream or `adapters/svelte`'s public prop types stop surfacing `Snippet`.
    // Tracked in DECISIONS.md.
    dts: false,
    tsconfig: '../../adapters/svelte/tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics] },
  },

  // Web (vanilla custom elements) — no framework peer.
  {
    entry: { 'web/index': '../../adapters/web/src/index.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: '../../adapters/web/tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics] },
  },

  // Tailwind
  {
    entry: { 'tailwind/index': '../../lib/tailwind/src/index.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: '../../lib/tailwind/tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics] },
  },

  // ESLint plugin — `@typescript-eslint/utils` stays external (a real dependency of consumers'
  // own eslint config, not something to duplicate into this bundle).
  {
    entry: { 'eslint/index': '../../plugins/eslint/src/index.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: '../../plugins/eslint/tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics, '@typescript-eslint/utils', /^@typescript-eslint\//] },
  },

  // TypeScript language service plugin — cjs required for tsserver's `require()`-based loading.
  // No `@praxis-kit/*` deps at all (pure TS compiler-API code) and no diagnostics import, so the
  // only thing to externalize is `typescript` itself (the plugin runs inside the consumer's own
  // tsserver process, which already has it loaded).
  {
    entry: { 'ts-plugin/index': '../../plugins/typescript/src/index.ts' },
    format: ['cjs'],
    dts: dts(),
    tsconfig: '../../plugins/typescript/tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: ['typescript'] },
  },

  // Vite plugin
  {
    entry: { 'vite-plugin/index': '../../plugins/vite/src/index.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: '../../plugins/vite/tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics, 'typescript'] },
  },

  // Codemod CLI — shebang banner required for bin execution. No `deps.neverBundle` for
  // `typescript`: confirmed empirically this entry has no bare `'typescript'` specifier to
  // externalize at all. `ts-morph`'s compiler access goes through `@ts-morph/common`, which
  // vendors its own `dist/typescript.js` (a relative-path file inside that package, checked in as
  // vendored source — not a `dependencies` edge on the real `typescript` npm package). tsdown
  // bundles it like any other local module regardless of `deps` config, so `praxis-codemod` ships
  // fully self-contained — consumers need no TypeScript install of their own for this entry.
  //
  // `shims: true` is required here, confirmed the hard way via a packed-tarball smoke test (`pnpm
  // pack` + install the tarball into a scratch fixture + run the bin): that vendored
  // `@ts-morph/common` code calls `isFileSystemCaseSensitive()`, which references `__filename` —
  // a CJS global with no equivalent in ESM output. Without this the published bin throws
  // `ReferenceError: __filename is not defined in ES module scope` on every invocation. No other
  // entry in this config touches `__filename`/`__dirname`.
  {
    entry: { 'codemod/index': '../../tooling/codemod/src/index.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: '../../tooling/codemod/tsconfig.json',
    fixedExtension: false,
    banner: { js: '#!/usr/bin/env node' },
    shims: true,
  },

  // Contract — framework-agnostic prop normalizers, state contracts, PropNormalizer type.
  {
    entry: { 'contract/index': './contract.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: 'tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics] },
  },

  // Guards — tag resolution and base type guards, for consumers authoring custom
  // enforcement.aria / enforcement.children rules.
  {
    entry: { 'guards/index': './guards.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: 'tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics] },
  },

  // HTML rule library — the built-in per-tag HTML/ARIA-fact rules merged automatically into every
  // component's enforcement.aria pipeline, exported for consumers to reference, compose around, or
  // discover.
  {
    entry: { 'html/index': './html.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: 'tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics] },
  },

  // Utils — general-purpose helpers (e.g. memoize) for consumers.
  {
    entry: { 'utils/index': './utils.ts' },
    format: ['esm'],
    dts: dts(),
    tsconfig: 'tsconfig.json',
    fixedExtension: false,
    deps: { neverBundle: [diagnostics] },
  },
])
