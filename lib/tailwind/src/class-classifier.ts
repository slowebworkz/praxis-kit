import type { LAYOUT_FAMILY_MAP} from './constants';
import { LAYOUT_OWNED_KEYS } from './constants'
import type { layoutKeys } from './layout-keys'
import type { ClassifiedToken, ClassToken, LayoutFamily, LayoutKey } from './types'
import { iterate } from '@praxis-kit/primitive'

const CONDITIONALS = {
  '[&.flex': 'flex',
  '[&.grid': 'grid',
} as const satisfies Readonly<
  Record<string, Exclude<LayoutFamily<typeof LAYOUT_FAMILY_MAP>, 'none'>>
>

export class ClassClassifier {
  static #getBaseUtility(token: string): string {
    let depth = 0

    return (
      iterate.findLast(token, (char, index) => {
        if (char === ']') depth++
        else if (char === '[') depth--
        else if (char === ':' && depth === 0 && token[index - 1] !== '\\') {
          return token.slice(index + 1)
        }

        return null
      }) ?? token
    )
  }

  classify(token: ClassToken): ClassifiedToken {
    const base = ClassClassifier.#getBaseUtility(token)

    if (LAYOUT_OWNED_KEYS.has(base)) {
      return {
        kind: 'layout',
        value: base as LayoutKey<typeof layoutKeys>,
        raw: token,
      }
    }

    const conditional: ClassifiedToken | null = iterate.find(
      Object.entries(CONDITIONALS),
      ([prefix, requires]) => {
        return token.startsWith(prefix)
          ? {
              kind: 'conditional',
              requires,
              raw: token,
            }
          : null
      },
    )
    if (conditional !== null) return conditional

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
