import type { ChildRuleInput } from '../types'
import { normalizeChildRule } from './normalize-child-rule'
import { RuleMatcher } from './rules-matcher'
import { getTypeName } from './get-type-name'

export type ChildViolationKind =
  | 'cardinality-min'
  | 'cardinality-max'
  | 'position'
  | 'unexpected'
  | 'ambiguous'

export type ChildViolation = {
  kind: ChildViolationKind
  message: string
  /** Present for cardinality and position violations. */
  ruleName?: string
  /** Present for unexpected and ambiguous violations. */
  childIndex?: number
}

export function diagnoseChildren(
  rules: readonly ChildRuleInput[],
  children: unknown[],
  context = 'Component',
): ChildViolation[] {
  if (rules.length === 0) return []

  const normalized = rules.map(normalizeChildRule)
  const matrix = new RuleMatcher().match(children, normalized)
  const violations: ChildViolation[] = []

  const firstIndex = 0
  const lastIndex = children.length - 1

  // Cardinality and position violations (mirrors RuleValidator)
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

  // Unexpected and ambiguous violations (mirrors MatchValidator)
  for (const [i, child] of children.entries()) {
    const matches = matrix.childToRules.forward.get(i as never)
    const typeName = getTypeName(child)

    if (!matches) {
      violations.push({
        kind: 'unexpected',
        message: `unexpected child "${typeName}" at index ${i}.`,
        childIndex: i,
      })
      continue
    }

    if (matches.size > 1) {
      const names = [...matches].map((ri) => `"${normalized[ri]?.name ?? `#${ri}`}"`)
      violations.push({
        kind: 'ambiguous',
        message: `child "${typeName}" at index ${i} matches multiple child rules: ${names.join(' and ')}.`,
        childIndex: i,
      })
    }
  }

  return violations
}
