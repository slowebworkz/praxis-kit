import type { ChildRuleContext, ChildRuleInput, NormalizedChildRule } from '../types'
import { isDynamicRule, isNumber, isString, iterate, resolveRule } from '@praxis-kit/primitive'
import { InvariantBase } from '../strict'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import { ContractDiagnostics } from '../diagnostics'
import { getTypeName } from './get-type-name'
import type { ResolvedChildRuleInput } from './normalize-child-rule'
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
  /** Rules with a static cardinality — normalized once, reused on every evaluate() call. */
  readonly #staticRules: NormalizedChildRule[]
  /** Rules whose cardinality is `dynamic(...)` — re-resolved against a ChildRuleContext per call. */
  readonly #dynamicRuleInputs: readonly ChildRuleInput[]
  readonly #matcher: RuleMatcher | undefined
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
    this.#exclusiveChildren = options.exclusiveChildren ?? false
    this.#allowText = options.allowText ?? true

    const staticRuleInputs: ChildRuleInput[] = []
    const dynamicRuleInputs: ChildRuleInput[] = []
    iterate.forEach(rules, (rule) => {
      if (isDynamicRule(rule.cardinality)) dynamicRuleInputs.push(rule)
      else staticRuleInputs.push(rule)
    })
    this.#dynamicRuleInputs = dynamicRuleInputs

    // Safe: staticRuleInputs was filtered by !isDynamicRule(rule.cardinality) above, so
    // every entry's cardinality is already a plain CardinalityInput (or undefined), never
    // a DynamicRule — the array-level filter just doesn't narrow the element type for TS.
    this.#staticRules = staticRuleInputs.map((r) =>
      normalizeChildRule(r as unknown as ResolvedChildRuleInput),
    )

    this.#ruleValidator = new RuleValidator(context, diagnostics)
    // No dynamic rules: precompute everything up front, matching the original build-once shape exactly.
    // (The position/cardinality invariant is enforced by normalizeChildRule above, for both the
    // static rules here and the resolved dynamic rules in #resolveRules.)
    this.#matcher =
      this.#dynamicRuleInputs.length === 0 ? new RuleMatcher(this.#staticRules) : undefined
  }

  /**
   * @param context Required when any rule has a `dynamic(...)` cardinality —
   *   supplies the resolved tag/props those rules are evaluated against.
   */
  evaluate(children: unknown[], context?: ChildRuleContext): void {
    // Cheap gate: skip the whole match/validate cycle when warning-level reporting is off.
    // NOTE: `warnActive` is Warning-scoped (see `Diagnostics`), while child violations route
    // through `violate()` at Error severity — a policy that ignores Warning but still reports
    // or throws on Error would over-skip here. Faithful to `../pk` (its `active` had the same
    // scope); tracked as a follow-up. All non-silent DefaultPolicy presets report Warning, so
    // this only bites a hand-built error-only policy.
    if (!this.warnActive) return

    const { rules, matcher } = this.#resolveRules(context)

    const {
      matrix,
      unexpectedIndices: rawUnexpectedIndices,
      ambiguousIndices,
    } = matcher.match(children)
    this.#ruleValidator.validate(rules, matrix, children.length)

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
        const names = [...matches].map((ri) => rules[ri]?.name ?? `#${ri}`)
        this.violate(ContractDiagnostics.ambiguousChild(typeName, ci, names, this.#context))
      }
    })
  }

  #resolveRules(context: ChildRuleContext | undefined): {
    rules: NormalizedChildRule[]
    matcher: RuleMatcher
  } {
    if (this.#dynamicRuleInputs.length === 0) {
      // this.#matcher is always set in this branch — assigned in the constructor whenever
      // #dynamicRuleInputs is empty.
      return { rules: this.#staticRules, matcher: this.#matcher! }
    }

    if (context === undefined) {
      throw new RangeError(
        `ChildrenEvaluator [${this.#context}]: rule(s) have a dynamic(...) cardinality — evaluate() requires a context argument to resolve them.`,
      )
    }

    const resolvedDynamicRules = this.#dynamicRuleInputs.map((r) => {
      // Safe: dynamicRuleInputs was filtered by isDynamicRule(rule.cardinality), so
      // r.cardinality is always defined here — the filter just doesn't narrow the
      // element type for TS once pushed into an array.
      const cardinality = resolveRule(r.cardinality!, context)
      // normalizeChildRule enforces the position/cardinality invariant, including for a
      // just-resolved dynamic cardinality.
      return normalizeChildRule({ ...r, cardinality })
    })

    const rules = [...this.#staticRules, ...resolvedDynamicRules]
    return { rules, matcher: new RuleMatcher(rules) }
  }
}
