import type { ChildRuleInput, NormalizedChildRule } from '../types'
import { isNumber, isString, iterate } from '@praxis-kit/primitive'
import { InvariantBase } from '../strict'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import { ContractDiagnostics } from '../diagnostics'
import { getTypeName } from './get-type-name'
import { normalizeChildRule } from './normalize-child-rule'
import { RuleMatcher } from './rules-matcher'
import { RuleValidator } from './rule-validator'

const isTextLike = (child: unknown): boolean => isString(child) || isNumber(child)

export type ChildrenEvaluatorOptions = {
  /**
   * When true, only children matching a rule (or text, per `allowText`) are
   * valid — anything else is rejected. Default: false (open — children not
   * matching any rule are allowed).
   */
  readonly exclusiveChildren?: boolean | undefined
  /**
   * When false, text/number child nodes are rejected regardless of
   * exclusiveChildren or any listed rule. Default: true.
   */
  readonly allowText?: boolean | undefined
}

export class ChildrenEvaluator extends InvariantBase {
  readonly #context: string
  readonly #rules: NormalizedChildRule[]
  readonly #ruleNames: readonly string[]
  readonly #matcher: RuleMatcher
  readonly #ruleValidator: RuleValidator
  readonly #exclusiveChildren: boolean
  readonly #allowText: boolean

  constructor(
    rules: readonly ChildRuleInput[],
    diagnostics: Diagnostics,
    context = 'Component',
    options: ChildrenEvaluatorOptions = {},
  ) {
    super(diagnostics)
    this.#context = context
    this.#rules = rules.map((r) => normalizeChildRule(r))
    this.#ruleNames = this.#rules.map((r) => r.name)
    this.#exclusiveChildren = options.exclusiveChildren ?? false
    this.#allowText = options.allowText ?? true

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
  }

  evaluate(children: unknown[]): void {
    // When no diagnostic would be reported, skip the full match/validate cycle.
    if (!this.active) return
    const {
      matrix,
      unexpectedIndices: rawUnexpectedIndices,
      ambiguousIndices,
    } = this.#matcher.match(children)
    this.#ruleValidator.validate(this.#rules, matrix, children.length)

    // A child matching zero rules is only a violation when the relevant mode says so:
    // text-like children need allowText === false, everything else needs exclusiveChildren.
    const unexpectedIndices = new Set(
      [...rawUnexpectedIndices].filter((ci) =>
        isTextLike(children[ci]) ? this.#allowText === false : this.#exclusiveChildren,
      ),
    )

    if (unexpectedIndices.size === 0 && ambiguousIndices.size === 0) return

    // Emit one diagnostic per violating child in index order.
    const violating = [...unexpectedIndices, ...ambiguousIndices].sort((a, b) => a - b)
    iterate.forEach(violating, (ci) => {
      const typeName = getTypeName(children[ci])
      if (unexpectedIndices.has(ci)) {
        this.violate(ContractDiagnostics.unexpectedChild(typeName, ci, this.#context))
      } else {
        const matches = matrix.childToRules.forward.get(ci)!
        const names = [...matches].map((ri) => this.#ruleNames[ri] ?? `#${ri}`)
        this.violate(ContractDiagnostics.ambiguousChild(typeName, ci, names, this.#context))
      }
    })
  }
}
