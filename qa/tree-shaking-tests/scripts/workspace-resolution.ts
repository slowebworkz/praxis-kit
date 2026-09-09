/**
 * Workspace-alias and consumer-external knowledge shared by scripts/{analyze,assert}.ts, and
 * exposed via this package's own "." export so qa/bundle-analysis can reuse it rather than
 * re-deriving the same ~20-key alias map a second time — bundle-analysis depends on
 * @praxis-kit/tree-shaking-tests and layers only the handful of extra aliases it alone needs on
 * top (see qa/bundle-analysis/scripts/workspace-alias.ts). See DECISIONS.md.
 *
 * A pure extraction out of what used to be inlined in analyze.ts/assert.ts — behavior here is
 * unchanged from before the extraction.
 *
 * This file is exported directly (not through a directory barrel) specifically so it can be
 * imported for its real runtime values from a plain `node --experimental-strip-types` script in
 * another package: Node's native ESM loader has no directory-to-index.ts fallback (unlike
 * TypeScript's "bundler" moduleResolution), so a package whose only export is a directory-style
 * barrel throws ERR_UNSUPPORTED_DIR_IMPORT the moment a Node-native script imports a real value
 * from it — see lib/foundation/README.md for the same problem solved the same way.
 */
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'esbuild'
import type { StringMap } from '@praxis-kit/primitive'

const pkg = dirname(fileURLToPath(import.meta.url))
const root = join(pkg, '../../..')

// Workspace source aliases (source/ scenarios only) — resolve published packages to their
// TypeScript source.
//
// `@praxis-kit/runtime/compiler` and `@praxis-kit/runtime` (../pk's aliases for its PK2 compiler
// scenarios) are deliberately absent: this repo has no `runtime/compiler` module at all yet
// (`lib/runtime` is flat, no compiler submodule), so the two scenarios that need it
// (`pk2-compiler-minimal`, `pk2-compiler-with-variants`) aren't ported — see DECISIONS.md.
//
// esbuild's `alias` does prefix-matching against unmatched subpaths (an import for
// `@praxis-kit/foo/bar` with no exact `@praxis-kit/foo/bar` key falls back to appending `/bar`
// onto whatever `@praxis-kit/foo` resolves to, which breaks against a single-file target) — every
// subpath actually reachable from these scenarios needs its own explicit entry. `primitive/tag`,
// `/utils`, and `contract/aria/roles`/`/aria/factories`/`/props`/`/types/aria/aria-rule` are extra
// here versus `../pk`'s own alias map: `packages/core/src/{primitive,contract}.ts` in this repo
// were refactored into pass-throughs against more granular barrels (see `DECISIONS.md`
// "`packages/kit` — scaffold"), so this repo's real import graph touches more subpaths than pk's.
export const workspaceAlias: StringMap<string> = {
  '@praxis-kit/pipeline': join(root, 'lib/pipeline/src/index.ts'),
  '@praxis-kit/react': join(root, 'adapters/react/src/index.ts'),
  '@praxis-kit/preact': join(root, 'adapters/preact/src/index.ts'),
  '@praxis-kit/vue': join(root, 'adapters/vue/src/index.ts'),
  '@praxis-kit/solid': join(root, 'adapters/solid/src/index.ts'),
  '@praxis-kit/svelte': join(root, 'adapters/svelte/src/index.ts'),
  '@praxis-kit/tailwind': join(root, 'lib/tailwind/src/index.ts'),
  '@praxis-kit/core': join(root, 'packages/core/src/index.ts'),
  '@praxis-kit/core/primitive': join(root, 'packages/core/src/primitive.ts'),
  '@praxis-kit/core/contract': join(root, 'packages/core/src/contract.ts'),
  '@praxis-kit/core/styling': join(root, 'packages/core/src/styling.ts'),
  '@praxis-kit/primitive/types/primitives': join(
    root,
    'lib/primitive/src/types/primitives/index.ts',
  ),
  '@praxis-kit/primitive/types': join(root, 'lib/primitive/src/types/index.ts'),
  '@praxis-kit/primitive/guards/children': join(root, 'lib/primitive/src/guards/children/index.ts'),
  '@praxis-kit/primitive/guards/aria': join(root, 'lib/primitive/src/guards/aria/index.ts'),
  '@praxis-kit/primitive/constants/aria': join(root, 'lib/primitive/src/constants/aria/index.ts'),
  '@praxis-kit/primitive/constants/primitive': join(
    root,
    'lib/primitive/src/constants/primitive/index.ts',
  ),
  '@praxis-kit/primitive/tag': join(root, 'lib/primitive/src/tag/index.ts'),
  '@praxis-kit/primitive/utils': join(root, 'lib/primitive/src/utils/index.ts'),
  '@praxis-kit/contract/aria/factories': join(root, 'lib/contract/src/aria/factories.ts'),
  '@praxis-kit/contract/aria/roles': join(root, 'lib/contract/src/aria/aria-roles.ts'),
  '@praxis-kit/contract/props': join(root, 'lib/contract/src/props/index.ts'),
  '@praxis-kit/contract/types/aria/aria-rule': join(
    root,
    'lib/contract/src/types/aria/aria-rule.ts',
  ),
  '@praxis-kit/adapter-utils': join(root, 'lib/adapter-utils/src/index.ts'),
}

// Consumer-owned runtimes, never bundled — provided by whoever actually installs the package, not
// shipped inside it. One policy, two mechanisms because esbuild's `external` option only takes
// exact strings; subpaths (`solid-js/web`, `preact/compat`, `@lit/reactive-element`, …) and Node
// builtins need the plugin's regex instead. React/Vue/svelte's own root imports are covered by the
// string list; everything scoped under a framework name, plus `node:*`, goes through the plugin.
export const consumerExternalStrings = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'vue',
  '@vue/server-renderer',
  'solid-js',
  'preact',
  'svelte',
  'lit',
]

export function consumerExternalPlugin(): Plugin {
  const re = /^(solid-js|preact|svelte|lit|lit-html|lit-element)\/|^@lit\/|^@lit-labs\/|^node:/
  return {
    name: 'consumer-external',
    setup(b) {
      b.onResolve({ filter: re }, (args) => ({ path: args.path, external: true }))
    },
  }
}

// Best-effort path → package-name resolver, covering this repo's own layout. A path this doesn't
// recognize contributes no package name (never silently matches everything).
export function toPackageName(path: string): string | undefined {
  let m = /^adapters\/([^/]+)\//.exec(path)
  if (m) return `@praxis-kit/${m[1]}`
  m = /^lib\/([^/]+)\//.exec(path)
  if (m) return `@praxis-kit/${m[1]}`
  if (/^packages\/core\//.test(path)) return '@praxis-kit/core'
  if (/^packages\/kit\/dist\//.test(path)) return 'praxis-kit'
  return undefined
}
