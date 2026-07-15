import type { LAYOUT_FAMILY_MAP } from './constants'
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

// Utilities that only have an effect inside a flex OR grid container, but
// aren't specific to either family: justify-content, align-items/self,
// align-content, order, and the place-* shorthands all apply to both flex
// and grid per the Tailwind docs. Like gap, these should survive when either
// family is active and be stripped when neither is.
//
// justify-items-/justify-self- are excluded — they're grid-only (no-ops on
// flex containers per the CSS box alignment spec) and handled by
// dependency-rules.ts instead.
const SHARED_PREFIXES: readonly RegExp[] = [
  /^order/,
  /^justify-(?!items-|self-)/,
  /^content-/,
  /^items-/,
  /^self-/,
  /^place-content-/,
  /^place-items-/,
  /^place-self-/,
]

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

    if (base === 'gap' || base.startsWith('gap-')) {
      return { kind: 'gap', raw: token }
    }

    if (SHARED_PREFIXES.some((rule) => rule.test(base))) {
      return { kind: 'shared', raw: token }
    }

    return { kind: 'utility', base, raw: token }
  }
}
