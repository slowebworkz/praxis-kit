/**
 * Claim: importing compileComponent without any demand passes excludes
 * variant-specific code (variantProvider, variant-lookup-pass, passes.ts).
 * The compiler core is present; demand modules are absent.
 */
import { compileComponent } from '@praxis-kit/runtime/compiler'

export { compileComponent }
