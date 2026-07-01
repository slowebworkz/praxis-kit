import type { ChildRuleInput, MatchMatrix, NormalizedChildRule, ChildViolation  } from '../types'
import { iterate } from '@praxis-kit/primitive'
import { normalizeChildRule } from './normalize-child-rule'
import { RuleMatcher } from './rules-matcher'
import { getTypeName } from './get-type-name'
import { ContractDiagnostics } from '../diagnostics'

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
): ChildViolation[] {
  if (rules.length === 0) return []

  const violations: ChildViolation[] = []

  const normalized = rules.map(normalizeChildRule)
  const { matrix, unexpectedIndices, ambiguousIndices } = new RuleMatcher(normalized).match(
    children,
  )

  const firstIndex = 0
  const lastIndex = children.length - 1

  addRuleViolations(violations, context, normalized, matrix, firstIndex, lastIndex)
  addUnexpectedViolations(violations, context, unexpectedIndices, children)
  addAmbiguousViolations(violations, context, ambiguousIndices, matrix, normalized, children)

  return violations
}
