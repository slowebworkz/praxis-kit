import type { ChildRuleInput, MatchMatrix, NormalizedChildRule } from '../types'
import { iterate } from '@praxis-kit/primitive'
import { normalizeChildRule } from './normalize-child-rule'
import { RuleMatcher } from './rules-matcher'
import { getTypeName } from './get-type-name'
import type { ChildViolation } from '@praxis-kit/primitive/types'

export type { ChildViolation, ChildViolationKind } from '@praxis-kit/primitive/types'

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
    violations.push({
      kind: 'cardinality-min',
      message: `${context}: "${name}" requires at least ${min}.`,
      ruleName: name,
    })
  } else if (matchCount > max) {
    violations.push({
      kind: 'cardinality-max',
      message: `${context}: "${name}" allows at most ${max}.`,
      ruleName: name,
    })
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
      violations.push({
        kind: 'position',
        message: `${context}: "${name}" must be ${position}, got index ${index}`,
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
  unexpectedIndices: ReadonlySet<number>,
  children: unknown[],
): void {
  iterate.forEachSet(unexpectedIndices, (ci) => {
    violations.push({
      kind: 'unexpected',
      message: `unexpected child "${getTypeName(children[ci])}" at index ${ci}.`,
      childIndex: ci,
    })
  })
}

function addAmbiguousViolations(
  violations: ChildViolation[],
  ambiguousIndices: ReadonlySet<number>,
  matrix: MatchMatrix,
  normalized: readonly NormalizedChildRule[],
  children: unknown[],
): void {
  iterate.forEachSet(ambiguousIndices, (ci) => {
    const matches = matrix.childToRules.forward.get(ci)!
    const names = [...matches].map((ri) => `"${normalized[ri]?.name ?? `#${ri}`}"`)
    violations.push({
      kind: 'ambiguous',
      message: `child "${getTypeName(children[ci])}" at index ${ci} matches multiple child rules: ${names.join(' and ')}.`,
      childIndex: ci,
    })
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
  addUnexpectedViolations(violations, unexpectedIndices, children)
  addAmbiguousViolations(violations, ambiguousIndices, matrix, normalized, children)

  return violations
}
