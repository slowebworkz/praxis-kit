import type {
  ChildRuleContext,
  ChildRuleInput,
  MatchMatrix,
  NormalizedChildRule,
  ChildViolation,
} from '../types'
import { isDynamicRule, isNumber, isString, iterate, resolveRule } from '@praxis-kit/primitive'
import { normalizeChildRule } from './normalize-child-rule'
import { RuleMatcher } from './rules-matcher'
import { getTypeName } from './get-type-name'
import { ContractDiagnostics } from '../diagnostics'

const isTextLike = (child: unknown): boolean => isString(child) || isNumber(child)

export type DiagnoseChildrenOptions = {
  readonly exclusiveChildren?: boolean | undefined
  readonly allowText?: boolean | undefined
}

function addCardinalityViolations(
  violations: ChildViolation[],
  context: string,
  rule: NormalizedChildRule,
  matchCount: number,
): void {
  const { name, cardinality } = rule
  if (cardinality.kind !== 'bounded') return

  const { min, max } = cardinality
  if (matchCount < min) {
    const d = ContractDiagnostics.cardinalityMin(name, min, context)
    violations.push({ kind: 'cardinality-min', message: d.message, diagnostic: d, ruleName: name })
  } else if (matchCount > max) {
    const d = ContractDiagnostics.cardinalityMax(name, max, context)
    violations.push({ kind: 'cardinality-max', message: d.message, diagnostic: d, ruleName: name })
  }
}

function addPositionViolations(
  violations: ChildViolation[],
  context: string,
  rule: NormalizedChildRule,
  matches: ReadonlySet<number> | undefined,
  firstIndex: number,
  lastIndex: number,
): void {
  const { name, position } = rule
  if (!matches || position === 'any') return

  iterate.forEachSet(matches, (index) => {
    const valid = position === 'first' ? index === firstIndex : index === lastIndex
    if (!valid) {
      const d = ContractDiagnostics.positionViolation(name, position, index, context)
      violations.push({
        kind: 'position',
        message: d.message,
        diagnostic: d,
        ruleName: name,
        childIndex: index,
      })
    }
  })
}

function addRuleViolations(
  violations: ChildViolation[],
  context: string,
  normalized: readonly NormalizedChildRule[],
  matrix: MatchMatrix,
  firstIndex: number,
  lastIndex: number,
): void {
  iterate.forEach(normalized, (rule, ri) => {
    const matches = matrix.childToRules.reverse.get(ri)
    const matchCount = matches?.size ?? 0
    addCardinalityViolations(violations, context, rule, matchCount)
    addPositionViolations(violations, context, rule, matches, firstIndex, lastIndex)
  })
}

function addUnexpectedViolations(
  violations: ChildViolation[],
  context: string,
  unexpectedIndices: ReadonlySet<number>,
  children: unknown[],
): void {
  iterate.forEachSet(unexpectedIndices, (ci) => {
    const d = ContractDiagnostics.unexpectedChild(getTypeName(children[ci]), ci, context)
    violations.push({ kind: 'unexpected', message: d.message, diagnostic: d, childIndex: ci })
  })
}

function addAmbiguousViolations(
  violations: ChildViolation[],
  context: string,
  ambiguousIndices: ReadonlySet<number>,
  matrix: MatchMatrix,
  normalized: readonly NormalizedChildRule[],
  children: unknown[],
): void {
  iterate.forEachSet(ambiguousIndices, (ci) => {
    const matches = matrix.childToRules.forward.get(ci)!
    const names = [...matches].map((ri) => normalized[ri]?.name ?? `#${ri}`)
    const d = ContractDiagnostics.ambiguousChild(getTypeName(children[ci]), ci, names, context)
    violations.push({ kind: 'ambiguous', message: d.message, diagnostic: d, childIndex: ci })
  })
}

export function diagnoseChildren(
  rules: readonly ChildRuleInput[],
  children: unknown[],
  context = 'Component',
  options: DiagnoseChildrenOptions = {},
  ruleContext?: ChildRuleContext,
): ChildViolation[] {
  const { exclusiveChildren = false, allowText = true } = options
  // With no rules and nothing to close/disallow, every child trivially passes.
  if (rules.length === 0 && !exclusiveChildren && allowText) return []

  const violations: ChildViolation[] = []

  const normalized = rules.map((rule) => {
    if (!isDynamicRule(rule.cardinality)) {
      // Safe: not a DynamicRule, so cardinality is already a plain CardinalityInput
      // (or undefined) — normalizeChildRule's expected shape.
      return normalizeChildRule(rule as unknown as Parameters<typeof normalizeChildRule>[0])
    }
    if (ruleContext === undefined) {
      throw new RangeError(
        `diagnoseChildren [${context}]: rule "${rule.name}" has a dynamic(...) cardinality — a ruleContext argument is required to resolve it.`,
      )
    }
    return normalizeChildRule({ ...rule, cardinality: resolveRule(rule.cardinality, ruleContext) })
  })
  const {
    matrix,
    unexpectedIndices: rawUnexpectedIndices,
    ambiguousIndices,
  } = new RuleMatcher(normalized).match(children)

  // A child matching zero rules is only a violation when the relevant mode says so:
  // text-like children need allowText === false, everything else needs exclusiveChildren.
  const unexpectedIndices = new Set(
    [...rawUnexpectedIndices].filter((ci) =>
      isTextLike(children[ci]) ? allowText === false : exclusiveChildren,
    ),
  )

  const firstIndex = 0
  const lastIndex = children.length - 1

  addRuleViolations(violations, context, normalized, matrix, firstIndex, lastIndex)
  addUnexpectedViolations(violations, context, unexpectedIndices, children)
  addAmbiguousViolations(violations, context, ambiguousIndices, matrix, normalized, children)

  return violations
}
