import type tsserverlibrary from 'typescript/lib/tsserverlibrary'
import {
  asArrayLiteralExpression,
  asNumericValue,
  asObjectLiteralExpression,
  getObjectProperty,
} from '../ast'
import { walkEnforcement } from './walk-enforcement'

type TS = typeof tsserverlibrary

export const NEGATIVE_MIN_CODE = 90002
export const NEGATIVE_MAX_CODE = 90003
export const MAX_LESS_THAN_MIN_CODE = 90004
// 90005 (`ZERO_MAX_CODE`) retired: `cardinality: { max: 0 }` is the canonical, expressive way to
// forbid a child type — the runtime enforces it (any match > 0 → violation), so it is not a
// lint concern. See DECISIONS.md.

export function checkValidCardinality(
  ts: TS,
  sourceFile: tsserverlibrary.SourceFile,
  calleeNames: ReadonlySet<string>,
): tsserverlibrary.DiagnosticWithLocation[] {
  const diagnostics: tsserverlibrary.DiagnosticWithLocation[] = []

  walkEnforcement(ts, sourceFile, calleeNames, (_, enf) => {
    const childrenProp = getObjectProperty(ts, enf, 'children')
    if (!childrenProp) return

    const arr = asArrayLiteralExpression(ts, childrenProp.initializer)
    if (!arr) return

    for (const element of arr.elements) {
      if (!ts.isObjectLiteralExpression(element)) continue

      const cardProp = getObjectProperty(ts, element, 'cardinality')
      if (!cardProp) continue

      const card = asObjectLiteralExpression(ts, cardProp.initializer)
      if (!card) continue

      const minProp = getObjectProperty(ts, card, 'min')
      const maxProp = getObjectProperty(ts, card, 'max')

      const min = minProp ? asNumericValue(ts, minProp.initializer) : undefined
      const max = maxProp ? asNumericValue(ts, maxProp.initializer) : undefined

      if (min !== undefined && min < 0) {
        diagnostics.push({
          file: sourceFile,
          start: minProp!.getStart(sourceFile),
          length: minProp!.getWidth(sourceFile),
          category: ts.DiagnosticCategory.Error,
          code: NEGATIVE_MIN_CODE,
          messageText: `cardinality.min must be >= 0 (got ${min}).`,
          source: '@praxis-kit/typescript-plugin',
        })
      }

      if (max !== undefined && max < 0) {
        diagnostics.push({
          file: sourceFile,
          start: maxProp!.getStart(sourceFile),
          length: maxProp!.getWidth(sourceFile),
          category: ts.DiagnosticCategory.Error,
          code: NEGATIVE_MAX_CODE,
          messageText: `cardinality.max must be >= 0 (got ${max}).`,
          source: '@praxis-kit/typescript-plugin',
        })
      }

      if (min !== undefined && max !== undefined && min >= 0 && max > 0 && max < min) {
        diagnostics.push({
          file: sourceFile,
          start: cardProp.getStart(sourceFile),
          length: cardProp.getWidth(sourceFile),
          category: ts.DiagnosticCategory.Error,
          code: MAX_LESS_THAN_MIN_CODE,
          messageText: `cardinality.max (${max}) must be >= cardinality.min (${min}). This rule can never be satisfied.`,
          source: '@praxis-kit/typescript-plugin',
        })
      }
    }
  })

  return diagnostics
}
