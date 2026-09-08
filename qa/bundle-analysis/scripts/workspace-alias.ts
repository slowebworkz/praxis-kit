/**
 * Aliases layered on top of @praxis-kit/tree-shaking-tests's own `workspaceAlias` — only the
 * subpaths this package alone needs. `react/legacy`, `lit`, and `web` have no tree-shaking-tests
 * scenario of their own today (lit/web landed after that package's scenario set; react/legacy is a
 * distinct subpath from `@praxis-kit/react`), so adding them to the shared module would be dead
 * weight in a package this one doesn't own — see DECISIONS.md.
 *
 * `@praxis-kit/core/{props,state,aria}` were expected here too when this package was planned (they
 * back packages/kit/contract.ts's re-exports), but turned out unnecessary: this package's
 * `contract`/`guards`/`html`/`utils` scenarios are package-tier only (they test the *built*
 * praxis-kit/contract pass-through, not a source-level equivalent — see scenarios/package/contract
 * /entry.ts), and no source/* scenario here imports those core subpaths directly. Left out rather
 * than added speculatively.
 */
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StringMap } from '@praxis-kit/primitive'

const pkg = dirname(fileURLToPath(import.meta.url))
const root = join(pkg, '../../..')

export const extraWorkspaceAlias: StringMap<string> = {
  '@praxis-kit/react/legacy': join(root, 'adapters/react/src/legacy/index.ts'),
  '@praxis-kit/lit': join(root, 'adapters/lit/src/index.ts'),
  '@praxis-kit/web': join(root, 'adapters/web/src/index.ts'),
}
