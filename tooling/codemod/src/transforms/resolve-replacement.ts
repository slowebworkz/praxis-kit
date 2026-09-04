import { SPECIAL_CASES } from './constants.js'

export function resolveReplacement(specifier: string): string | undefined {
  if (!specifier.startsWith('@praxis-kit/')) return undefined
  return SPECIAL_CASES[specifier] ?? specifier.replace('@praxis-kit/', 'praxis-kit/')
}
