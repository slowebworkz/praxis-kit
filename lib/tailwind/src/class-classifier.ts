import { LAYOUT_OWNED_KEYS } from './constants'
import type { layoutKeys } from './layout-keys'
import type { ClassifiedToken, ClassToken, ConditionalToken, LayoutKey } from './types'
import { isNonNull } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'

// The families a conditional token can require — taken from `ConditionalToken` so the
// `Exclude<…, 'none'>` lives in one place (types/classified-token.ts).
type ConditionalFamily = ConditionalToken['requires']

// Selector-prefix → family the token requires. `satisfies` checks each value against
// `ConditionalFamily` while `as const` keeps the literal keys and values.
type ConditionalPrefixMap = StringMap<ConditionalFamily>

const CONDITIONALS = {
  '[&.flex': 'flex',
  '[&.grid': 'grid',
} as const satisfies Readonly<ConditionalPrefixMap>

// Hoisted: `classify` runs for every class token on every render, so don't rebuild this array
// per call.
const CONDITIONAL_ENTRIES = Object.entries(CONDITIONALS)

// Narrows to a layout key without a cast at the use site. Backed by the owned-keys set so the
// runtime check and the type can't drift from `layoutKeys`.
function isLayoutKey(base: string): base is LayoutKey<typeof layoutKeys> {
  return LAYOUT_OWNED_KEYS.has(base)
}

// Flex/grid *item* (and item-placement) properties. Unlike container properties,
// these resolve against the element's PARENT display mode — an element is very
// often not a flex/grid container itself while still legitimately being a
// flex/grid *item* of its parent. This plugin can't observe the parent, so it
// must never strip these based on the element's own family: they're meaningful
// whenever the parent is a flex/grid container, and an inert no-op (not a
// conflict) otherwise. See PRAXIS-KIT-FINDINGS.md #40.
//
// - align-self / place-self / justify-self  → self-*, place-self-*, justify-self-*
// - order                                   → order-*
// - flex-grow / flex-shrink / flex-basis    → grow, shrink, basis-*
// - grid-row / grid-column                  → row-*, col-*
const ITEM_PREFIXES: readonly RegExp[] = [
  /^order/,
  /^grow/,
  /^shrink/,
  /^basis-/,
  /^self-/,
  /^place-self-/,
  /^justify-self-/,
  /^col-/,
  /^row-/,
]

// Utilities that only have an effect inside a flex OR grid *container*, but
// aren't specific to either family: justify-content, align-items, align-content,
// and the place-content/place-items shorthands all apply to both flex and grid
// per the Tailwind docs. Like gap, these should survive when either family is
// active on the element itself and be stripped when neither is.
//
// justify-items- is excluded — it's a grid-container property (no-op on flex),
// handled by dependency-rules.ts. justify-self- is an item property, handled by
// ITEM_PREFIXES above.
//
// content- is enumerated rather than an open `/^content-/` prefix: the CSS
// content property (`content-['<']`, `content-none`, etc., used via
// before:/after:) is base-shaped identically to the flex/grid content-*
// alignment family after variant-prefix stripping, but is valid on any
// element regardless of display mode and must never be treated as shared.
const SHARED_PREFIXES: readonly RegExp[] = [
  /^justify-(?!items-|self-)/,
  /^content-(normal|center|start|end|between|around|evenly|stretch)$/,
  /^items-/,
  /^place-content-/,
  /^place-items-/,
]

export class ClassClassifier {
  static #getBaseUtility(token: string): string {
    // Most tokens have no variant prefix; the scan below only ever returns on a `:`.
    if (!token.includes(':')) return token

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
    const rawBase = ClassClassifier.#getBaseUtility(token)
    // Tailwind v4 accepts the important modifier before or after the utility
    // (`!flex-col` / `flex-col!`). Strip it for dependency classification so
    // both spellings follow the same rules; keep `raw` unchanged for output.
    const leadingBang = rawBase.startsWith('!')
    const trailingBang = rawBase.endsWith('!')
    const hasImportantModifier = leadingBang || trailingBang
    const base = hasImportantModifier
      ? rawBase.slice(leadingBang ? 1 : 0, trailingBang ? -1 : undefined)
      : rawBase

    if (isLayoutKey(base)) {
      // Preserve important display utilities as utilities, not layout tokens.
      // Their important marker remains in `base`, so the dependency evaluator
      // does not treat them as ordinary reserved display classes. This preserves
      // the existing `!flex` / `md:!flex` escape hatch. Changing that behavior
      // would be a separate compatibility decision.
      if (hasImportantModifier) return { kind: 'utility', base: rawBase, raw: token }
      return { kind: 'layout', value: base, raw: token }
    }

    const conditional: ClassifiedToken | null = iterate.find(
      CONDITIONAL_ENTRIES,
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
    if (isNonNull(conditional)) return conditional

    if (base === 'gap' || base.startsWith('gap-')) {
      return { kind: 'gap', raw: token }
    }

    if (ITEM_PREFIXES.some((rule) => rule.test(base))) {
      return { kind: 'item', raw: token }
    }

    if (SHARED_PREFIXES.some((rule) => rule.test(base))) {
      return { kind: 'shared', raw: token }
    }

    return { kind: 'utility', base, raw: token }
  }
}
