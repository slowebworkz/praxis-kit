/**
 * Surgical package-consumption scenario: importing only `praxis-kit/contract` (the
 * framework-neutral contract-authoring surface) should pull in core + primitive + the shared
 * diagnostics chunk, and nothing from any framework adapter.
 *
 * Adapter-scoped equivalents (e.g. "react-primitive-only") were considered and dropped: every
 * `praxis-kit/<adapter>` entry's only real export is `createContractComponent`, already bundled
 * as one function by packages/kit's own build — there's no shallower value-level import to make
 * from an adapter entry that would pull in less. The 5 original source/* scenarios that tried this
 * distinction (aria-only, contracts-only, full-runtime, minimal-polymorphic,
 * polymorphic-validation) all produced byte-identical bundles for exactly this reason — their only
 * differences were type-only imports, erased before esbuild ever sees them. The framework-neutral
 * entries (`contract`, `guards`, `html`, `utils`) are where real, distinct dependency footprints
 * actually exist to test at the package boundary.
 */
import { disabledContract } from 'praxis-kit/contract'

export { disabledContract }
