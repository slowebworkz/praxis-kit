import type { ChildRuleInput, NormalizedChildRule, StrictMode } from '../types'
import { StrictBase } from '../base'
import { MatchValidator } from './match-validator'
import { normalizeChildRule } from './normalize-child-rule'
import { RuleMatcher } from './rules-matcher'
import { RuleValidator } from './rule-validator'

export class ChildrenEvaluator extends StrictBase {
  readonly #rules: NormalizedChildRule[]
  readonly #ruleNames: readonly string[]
  readonly #matcher: RuleMatcher
  readonly #ruleValidator: RuleValidator
  readonly #matchValidator: MatchValidator

  constructor(rules: ChildRuleInput[], strict: StrictMode = 'warn', context = 'Component') {
    super(strict)

    this.#rules = rules.map((r) => normalizeChildRule(r))
    this.#ruleNames = this.#rules.map((r) => r.name)

    for (const rule of this.#rules) {
      const { name, position, cardinality } = rule
      // A positional rule can satisfy at most one child by definition; allowing max>1
      // creates a cardinality that is structurally impossible to ever satisfy.
      if (
        (position === 'first' || position === 'last') &&
        (cardinality.kind === 'unbounded' || cardinality.max > 1)
      ) {
        throw new RangeError(
          `ChildrenEvaluator [${context}]: rule "${name}" sets position="${position}" with an unbound or >1 max. position="first|last" implies max=1.`,
        )
      }
    }

    this.#matcher = new RuleMatcher()
    this.#ruleValidator = new RuleValidator(context, strict)
    this.#matchValidator = new MatchValidator(context, strict)
  }

  evaluate(children: unknown[]): void {
    const matrix = this.#matcher.match(children, this.#rules)
    this.#ruleValidator.validate(this.#rules, matrix, children.length)
    this.#matchValidator.validate(children, matrix, this.#ruleNames)
  }
}
