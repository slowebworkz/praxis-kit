import type { NormalizedChildRule, MatchMatrix, RuleIndex, StrictMode } from '../types'
import { StrictBase } from '../base'
import { assertNever } from '../utils'

export class RuleValidator extends StrictBase {
  readonly #context: string

  constructor(context: string, strict: StrictMode) {
    super(strict)
    this.#context = context
  }

  validate(rules: NormalizedChildRule[], matrix: MatchMatrix, childCount: number): void {
    const firstIndex = 0
    const lastIndex = childCount - 1

    for (const [ri, rule] of rules.entries()) {
      const matches = matrix.childToRules.reverse.get(ri as RuleIndex)
      const matchCount = matches?.size ?? 0
      const { cardinality, position, name } = rule

      if (cardinality.kind === 'bounded') {
        const { min, max } = cardinality
        if (matchCount < min) {
          this.violate(`${this.#context}: "${name}" requires at least ${min}.`)
          continue
        }
        if (matchCount > max) {
          this.violate(`${this.#context}: "${name}" allows at most ${max}.`)
          continue
        }
      }

      if (matches) {
        for (const index of matches) {
          if (!RuleValidator.#isValidPosition(index, position, firstIndex, lastIndex)) {
            this.violate(`${this.#context}: "${name}" must be ${position}, got index ${index}`)
          }
        }
      }
    }
  }

  static #isValidPosition(
    matchIndex: number,
    position: NormalizedChildRule['position'],
    firstIndex: number,
    lastIndex: number,
  ): boolean {
    switch (position) {
      case 'first':
        return matchIndex === firstIndex
      case 'last':
        return matchIndex === lastIndex
      case 'any':
        return true
      default:
        return assertNever(position)
    }
  }
}
