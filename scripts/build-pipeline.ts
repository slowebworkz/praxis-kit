/**
 * build-pipeline.ts
 *
 * Ensures packages/kit is built before running `pnpm check`. examples/* depend
 * on praxis-kit/<adapter> (packages/kit's published subpaths), which only exist
 * once packages/kit is built — pnpm check alone has no awareness of that
 * ordering requirement. Both CI (.github/workflows/ci.yml) and local
 * `pnpm verify` call this single script instead of duplicating the ordering
 * logic in two places.
 *
 * Run: tsx scripts/build-pipeline.ts (or `pnpm verify`)
 *
 * Uses tsx rather than `node --experimental-strip-types`: lib/pipeline's own
 * source uses extensionless relative imports (TypeScript's "bundler"
 * resolution convention), which Node's native ESM loader doesn't resolve even
 * with type-stripping enabled — that only erases type syntax, it doesn't
 * change module resolution. tsx handles bundler-style resolution directly.
 */

import { executePipeline, shallowObjectMerge, startPipeline } from '@praxis-kit/pipeline'
import { shellPass } from '@praxis-kit/pipeline/node'

type Context = Record<string, never>

const buildPraxisKit = shellPass<Context>('build-praxis-kit', 'pnpm', [
  '--filter',
  './packages/kit',
  'build',
])

const check = shellPass<Context>('check', 'pnpm', ['check'])

const pipeline = startPipeline<Context>({
  name: 'verify',
  strategy: 'sequential',
  merge: shallowObjectMerge,
})
  .then(buildPraxisKit)
  .then(check)
  .build()

try {
  await executePipeline(pipeline, {})
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
