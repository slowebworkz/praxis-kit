/**
 * A consumer who uses another language: the resolver plus their own locale catalog (a plain JSON
 * file, as a locale pack would be), and never `praxis-kit-diagnostics/en`. This is the case the
 * package is built for: choosing a different language leaves English out of the bundle.
 */
import { createMessageResolver } from 'praxis-kit-diagnostics'
import de from './de.json'

export const resolve = createMessageResolver(de)
