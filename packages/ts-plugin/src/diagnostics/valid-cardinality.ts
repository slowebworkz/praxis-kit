import type tsserverlibrary from 'typescript/lib/tsserverlibrary'
import {
  asArrayLiteralExpression,
  asNumericValue,
  asObjectLiteralExpression,
  getFirstObjectArg,
  getObjectProperty,
  isFactoryCall,
} from '../ast'

type TS = typeof tsserverlibrary

export const NEGATIVE_MIN_CODE = 90002
export const NEGATIVE_MAX_CODE = 90003
export const MAX_LESS_THAN_MIN_CODE = 90004
export const ZERO_MAX_CODE = 90005

export function checkValidCardinality(
  ts: TS,
  sourceFile: tsserverlibrary.SourceFile,
  calleeNames: ReadonlySet<string>,
): tsserverlibrary.DiagnosticWithLocation[] {
  const diagnostics: tsserverlibrary.DiagnosticWithLocation[] = []

  function visit(node: tsserverlibrary.Node): void {
    if (ts.isCallExpression(node) && isFactoryCall(ts, node, calleeNames)) {
      const arg = getFirstObjectArg(ts, node)
      if (arg) {
        const enfProp = getObjectProperty(ts, arg, 'enforcement')
        if (enfProp) {
          const enf = asObjectLiteralExpression(ts, enfProp.initializer)
          if (enf) {
            const childrenProp = getObjectProperty(ts, enf, 'children')
            if (childrenProp) {
              const arr = asArrayLiteralExpression(ts, childrenProp.initializer)
              if (arr) {
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
                      source: '@polymorphic-ui/ts-plugin',
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
                      source: '@polymorphic-ui/ts-plugin',
                    })
                  }

                  if (max !== undefined && max === 0) {
                    diagnostics.push({
                      file: sourceFile,
                      start: maxProp!.getStart(sourceFile),
                      length: maxProp!.getWidth(sourceFile),
                      category: ts.DiagnosticCategory.Warning,
                      code: ZERO_MAX_CODE,
                      messageText: `cardinality.max of 0 means no children of this type are allowed. Use 0 intentionally or remove the rule.`,
                      source: '@polymorphic-ui/ts-plugin',
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
                      source: '@polymorphic-ui/ts-plugin',
                    })
                  }
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return diagnostics
}
