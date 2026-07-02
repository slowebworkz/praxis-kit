/**
 * Claim: importing variantProvider brings in the variant demand-pass code
 * (passes.ts, variant-provider.ts) without pulling in adapter or style code.
 */
import { variantProvider, compileComponent } from '@praxis-kit/runtime'

export { variantProvider, compileComponent }
