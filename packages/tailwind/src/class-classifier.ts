import type { ClassifiedToken, ClassToken } from './types/classified-token'

export class ClassClassifier {
  static #getBaseUtility(cls: string): string {
    let depth = 0

    for (let i = cls.length - 1; i >= 0; i--) {
      const char = cls[i]

      if (char === ']') depth++
      else if (char === '[') depth--
      else if (char === ':' && depth === 0) {
        return cls.slice(i + 1)
      }
    }

    return cls
  }

  classify(token: ClassToken): ClassifiedToken {
    const base = ClassClassifier.#getBaseUtility(token)

    if (base === 'flex' || base === 'inline-flex') {
      return { kind: 'layout', value: 'flex', raw: token }
    }

    if (base === 'grid' || base === 'inline-grid') {
      return { kind: 'layout', value: 'grid', raw: token }
    }

    if (token.startsWith('[&.flex]')) {
      return { kind: 'conditional', requires: 'flex', raw: token }
    }

    if (token.startsWith('[&.grid]')) {
      return { kind: 'conditional', requires: 'grid', raw: token }
    }

    if (base === 'gap' || base.startsWith('gap-')) {
      return { kind: 'gap', raw: token }
    }

    return { kind: 'utility', base, raw: token }
  }
}
