import type { ChildRuleInput, NormalizedChildRule } from '../types'
import { iterate } from '@praxis-kit/primitive'
import { StrictBase } from '../strict'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import { getTypeName } from './get-type-name'
import { MatchValidationErrorBuilder } from './match-validation-error-builder'
import { normalizeChildRule } from './normalize-child-rule'
import { RuleMatcher } from './rules-matcher'
import { RuleValidator } from './rule-validator'

export class ChildrenEvaluator extends StrictBase {
  readonly #rules: NormalizedChildRule[]
  readonly #ruleNames: readonly string[]
  readonly #matcher: RuleMatcher
  readonly #ruleValidator: RuleValidator
  readonly #matchBuilder: MatchValidationErrorBuilder

  constructor(rules: readonly ChildRuleInput[], diagnostics: Diagnostics, context = 'Component') {
    super(diagnostics)

    this.#rules = rules.map((r) => normalizeChildRule(r))
    this.#ruleNames = this.#rules.map((r) => r.name)

    iterate.forEach(this.#rules, (rule) => {
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
    })

    this.#matcher = new RuleMatcher(this.#rules)
    this.#ruleValidator = new RuleValidator(context, diagnostics)
    this.#matchBuilder = new MatchValidationErrorBuilder(context)
  }

  evaluate(children: unknown[]): void {
    // When no diagnostic would be reported, skip the full match/validate cycle.
    if (!this.active) return
    const { matrix, unexpectedIndices, ambiguousIndices } = this.#matcher.match(children)
    this.#ruleValidator.validate(this.#rules, matrix, children.length)

    if (unexpectedIndices.size === 0 && ambiguousIndices.size === 0) return

    // Process only violating children in index order — no full re-traversal.
    const errors: string[] = []
    const violating = [...unexpectedIndices, ...ambiguousIndices].sort((a, b) => a - b)
    iterate.forEach(violating, (ci) => {
      const typeName = getTypeName(children[ci])
      if (unexpectedIndices.has(ci)) {
        errors.push(this.#matchBuilder.unexpectedChild(typeName, ci))
      } else {
        const matches = matrix.childToRules.forward.get(ci)!
        const names = [...matches].map((ri) => this.#ruleNames[ri] ?? `#${ri}`)
        errors.push(this.#matchBuilder.multipleMatches(typeName, ci, names))
      }
    })

    this.invariant(errors.length === 0, this.#matchBuilder.toError(errors).message)
  }
}
