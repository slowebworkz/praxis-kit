/**
 * Package-boundary counterpart to scenarios/source/react-minimal: imports the *published*
 * `praxis-kit/react` entry (resolved for real via node module resolution against
 * packages/kit's built dist/, not aliased to source) rather than `@praxis-kit/react` workspace
 * source. Proves the exports map / built JS a real consumer receives is actually tree-shakeable,
 * not just the source graph. Requires `pnpm --filter praxis-kit build` to have run first.
 */
import { createContractComponent } from 'praxis-kit/react'

export { createContractComponent }
