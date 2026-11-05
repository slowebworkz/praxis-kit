/**
 * Control for the two scenarios above: importing `praxis-kit-diagnostics/en` is what puts English in
 * a bundle. If its bundle stops containing the English text, the "excluded" assertions elsewhere prove nothing.
 */
import { createMessageResolver } from 'praxis-kit-diagnostics'
import en from 'praxis-kit-diagnostics/en'

export const resolve = createMessageResolver(en)
