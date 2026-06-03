import type { ChildRuleInput } from '../types'
import { normalizeChildRule } from './normalize-child-rule'
import { RuleMatcher } from './rules-matcher'
import { getTypeName } from './get-type-name'
import type { ChildViolation } from '@praxis-ui/shared/types'

export type { ChildViolation, ChildViolationKind } from '@praxis-ui/shared/types'

export function diagnoseChildren(
  rules: readonly ChildRuleInput[],
  children: unknown[],
  context = 'Component',
): ChildViolation[] {
  if (rules.length === 0) return []

  const normalized = rules.map(normalizeChildRule)
  const { matrix, unexpectedIndices, ambiguousIndices } = new RuleMatcher(normalized).match(
    children,
  )
  const violations: ChildViolation[] = []

  const firstIndex = 0
  const lastIndex = children.length - 1

  // Cardinality and position violations
  for (const [ri, rule] of normalized.entries()) {
    const matches = matrix.childToRules.reverse.get(ri as never)
    const matchCount = matches?.size ?? 0
    const { name, cardinality, position } = rule

    if (cardinality.kind === 'bounded') {
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

    if (matches && position !== 'any') {
      for (const index of matches) {
        const valid = position === 'first' ? index === firstIndex : index === lastIndex
        if (!valid) {
          violations.push({
            kind: 'position',
            message: `${context}: "${name}" must be ${position}, got index ${index}`,
            ruleName: name,
            childIndex: index,
          })
        }
      }
    }
  }

  // Unexpected and ambiguous violations — iterate only violating child indices.
  for (const ci of unexpectedIndices) {
    violations.push({
      kind: 'unexpected',
      message: `unexpected child "${getTypeName(children[ci])}" at index ${ci}.`,
      childIndex: ci,
    })
  }

  for (const ci of ambiguousIndices) {
    const matches = matrix.childToRules.forward.get(ci as never)!
    const names = [...matches].map((ri) => `"${normalized[ri]?.name ?? `#${ri}`}"`)
    violations.push({
      kind: 'ambiguous',
      message: `child "${getTypeName(children[ci])}" at index ${ci} matches multiple child rules: ${names.join(' and ')}.`,
      childIndex: ci,
    })
  }

  return violations
}
