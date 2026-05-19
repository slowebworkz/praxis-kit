import type { ClassifiedToken, ClassToken } from './types/classified-token'

const LAYOUTS = {
  flex: 'flex',
  'inline-flex': 'flex',
  grid: 'grid',
  'inline-grid': 'grid',
} as const

const CONDITIONALS = {
  '[&.flex': 'flex',
  '[&.grid': 'grid',
} as const

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

    const layout = LAYOUTS[base as keyof typeof LAYOUTS]

    if (layout) {
      return {
        kind: 'layout',
        value: layout,
        raw: token,
      }
    }

    for (const prefix in CONDITIONALS) {
      if (token.startsWith(prefix)) {
        return {
          kind: 'conditional',
          requires: CONDITIONALS[prefix as keyof typeof CONDITIONALS],
          raw: token,
        }
      }
    }

    return base.startsWith('gap')
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
