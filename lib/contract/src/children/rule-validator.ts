import type { MatchMatrix, NormalizedChildRule, StrictMode } from '../types'
import { assertNever, iterate } from '@praxis-kit/primitive'
import { StrictBase } from '../strict'

export class RuleValidator extends StrictBase {
  readonly #context: string

  constructor(context: string, strict: StrictMode) {
    super(strict)
    this.#context = context
  }

  validate(rules: NormalizedChildRule[], matrix: MatchMatrix, childCount: number): void {
    const firstIndex = 0
    const lastIndex = childCount - 1

    iterate.forEach(rules, (rule, ri) => {
      // reverse is pre-initialized for every rule index, so .get() is always defined.
      const matches = matrix.childToRules.reverse.get(ri)!
      const matchCount = matches.size

      this.#validateCardinality(rule, matchCount)

      if (matchCount === 0) return

      this.#validatePositions(rule, matches, firstIndex, lastIndex)
    })
  }

  #validateCardinality(rule: NormalizedChildRule, matchCount: number): void {
    const { cardinality, name } = rule

    if (cardinality.kind !== 'bounded') {
      return
    }

    const { min, max } = cardinality

    if (matchCount < min) {
      this.violate(`${this.#context}: "${name}" requires at least ${min}.`)

      return
    }

    if (matchCount > max) {
      this.violate(`${this.#context}: "${name}" allows at most ${max}.`)
    }
  }

  #validatePositions(
    rule: NormalizedChildRule,
    matches: ReadonlySet<number>,
    firstIndex: number,
    lastIndex: number,
  ): void {
    const { name, position } = rule
    iterate.forEachSet(matches, (index) => {
      if (RuleValidator.#isValidPosition(index, position, firstIndex, lastIndex)) {
        return
      }

      this.violate(`${this.#context}: "${name}" must be ${position}, got index ${index}`)
    })
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
