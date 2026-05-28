import type tsserverlibrary from 'typescript/lib/tsserverlibrary'
import { asArrayLiteralExpression, getObjectProperty } from '../ast'
import { walkEnforcement } from './walk-enforcement'

type TS = typeof tsserverlibrary

export const MISSING_STRICT_CODE = 90001

export function checkNoEnforcementWithoutStrict(
  ts: TS,
  sourceFile: tsserverlibrary.SourceFile,
  calleeNames: ReadonlySet<string>,
): tsserverlibrary.DiagnosticWithLocation[] {
  const diagnostics: tsserverlibrary.DiagnosticWithLocation[] = []

  walkEnforcement(ts, sourceFile, calleeNames, (node, enf) => {
    const hasStrict = getObjectProperty(ts, enf, 'strict') !== undefined
    if (!hasStrict) {
      for (const field of ['children', 'aria'] as const) {
        const fieldProp = getObjectProperty(ts, enf, field)
        if (!fieldProp) continue

        if (field === 'children') {
          const arr = asArrayLiteralExpression(ts, fieldProp.initializer)
          if (!arr || arr.elements.length === 0) continue
        }

        diagnostics.push({
          file: sourceFile,
          start: node.getStart(sourceFile),
          length: node.getWidth(sourceFile),
          category: ts.DiagnosticCategory.Warning,
          code: MISSING_STRICT_CODE,
          messageText: `enforcement.${field} is defined but enforcement.strict is not explicitly set. Adapter defaults vary — declare strict explicitly so the behavior is clear at the call site.`,
          source: '@praxis-ui/ts-plugin',
        })
        break
      }
    }
  })

  return diagnostics
}
