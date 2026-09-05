/**
 * Package-boundary counterpart to scenarios/source/react-minimal: imports `praxis-kit/react`
 * (resolved via ordinary node module resolution against packages/kit's built dist/, not aliased to
 * source) rather than `@praxis-kit/react` workspace source. This is package-consumption testing,
 * not published-package testing — resolution goes through the pnpm workspace link, not an actual
 * `pnpm pack` tarball (see scripts/analyze.ts). Proves the built, minified JS this workspace
 * produces is actually tree-shakeable, not just the source graph. Requires
 * `pnpm --filter praxis-kit build` to have run first.
 */
import { createContractComponent } from 'praxis-kit/react'

export { createContractComponent }
