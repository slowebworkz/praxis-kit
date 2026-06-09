import { LAYOUT_OWNED_KEYS } from './constants'
import type { ClassifiedToken, ClassToken, LayoutFamily, LayoutKey } from './types'

const CONDITIONALS = {
  '[&.flex': 'flex',
  '[&.grid': 'grid',
} as const satisfies Readonly<Record<string, Exclude<LayoutFamily, 'none'>>>

export class ClassClassifier {
  static #getBaseUtility(token: string): string {
    let depth = 0

    for (let i = token.length - 1; i >= 0; i--) {
      const char = token[i]

      if (char === ']') depth++
      else if (char === '[') depth--
      else if (char === ':' && depth === 0 && token[i - 1] !== '\\') {
        return token.slice(i + 1)
      }
    }

    return token
  }

  classify(token: ClassToken): ClassifiedToken {
    const base = ClassClassifier.#getBaseUtility(token)

    if (LAYOUT_OWNED_KEYS.has(base)) {
      return {
        kind: 'layout',
        value: base as LayoutKey,
        raw: token,
      }
    }

    for (const [prefix, requires] of Object.entries(CONDITIONALS)) {
      if (token.startsWith(prefix)) {
        return {
          kind: 'conditional',
          requires,
          raw: token,
        }
      }
    }

    return base === 'gap' || base.startsWith('gap-')
      ? {
          kind: 'gap',
          raw: token,
        }
      : {
          kind: 'utility',
          base,
          raw: token,
        }
  }
}
