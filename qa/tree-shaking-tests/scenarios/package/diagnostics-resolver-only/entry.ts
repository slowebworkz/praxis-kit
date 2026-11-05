/**
 * Package-boundary scenario for `praxis-kit-diagnostics`: the resolver and validator, with no
 * catalog. English is its own entry (`praxis-kit-diagnostics/en`), so importing only the resolver
 * must not put the English catalog in the bundle (checked by its text, since a bundler may merge
 * the catalog's module into another file), and the package must not drag in `praxis-kit`
 * (it has no dependency on it). Requires `pnpm --filter praxis-kit-diagnostics build` first.
 */
import { createMessageResolver, validateCatalog } from 'praxis-kit-diagnostics'

export { createMessageResolver, validateCatalog }
