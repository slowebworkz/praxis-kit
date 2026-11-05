/**
 * Package-boundary scenario for `praxis-kit-diagnostics` when a tool also validates catalogs
 * (`checkCatalog`, `validateCatalog`). This is the heavier, build-time path; the runtime path is
 * `diagnostics-resolver-only`. English must still stay out, and so must `praxis-kit`.
 */
import { checkCatalog, createMessageResolver, validateCatalog } from 'praxis-kit-diagnostics'

export { checkCatalog, createMessageResolver, validateCatalog }
