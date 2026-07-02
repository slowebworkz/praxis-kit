import type { Pass } from '@praxis-kit/pipeline'
import type { VariantConfig } from '@praxis-kit/styling'
import { compileVariantLookup } from '@praxis-kit/styling'
import type { CompilerContext } from './types'

/**
 * Compiler pass that builds a variant + compound class lookup table and stores
 * it in `artifact.precomputed.variantLookup`. At runtime the adapter can call
 * `buildPrecomputedKey(activeProps)` and look up the result directly, skipping
 * both `createVariantPass` and compound resolution for covered combinations.
 *
 * Produces a no-op pass when variant combinations exceed 512 — the runtime
 * variant pass remains the fallback.
 */
export function variantLookupPass(config: VariantConfig, name: string): Pass<CompilerContext> {
  const variantLookup = compileVariantLookup(config)
  if (variantLookup === null) return { name, execute: () => ({}) }
  return {
    name,
    execute: () => ({ context: { precomputed: { variantLookup } } }),
  }
}
