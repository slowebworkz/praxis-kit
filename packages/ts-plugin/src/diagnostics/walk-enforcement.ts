import type tsserverlibrary from 'typescript/lib/tsserverlibrary'
import {
  asObjectLiteralExpression,
  getFirstObjectArg,
  getObjectProperty,
  isFactoryCall,
} from '../ast'

type TS = typeof tsserverlibrary

/**
 * Walks a source file and calls `cb` for every factory call that has a
 * statically-resolvable `enforcement` object literal argument.
 */
export function walkEnforcement(
  ts: TS,
  sourceFile: tsserverlibrary.SourceFile,
  calleeNames: ReadonlySet<string>,
  cb: (node: tsserverlibrary.CallExpression, enf: tsserverlibrary.ObjectLiteralExpression) => void,
): void {
  function visit(node: tsserverlibrary.Node): void {
    if (ts.isCallExpression(node) && isFactoryCall(ts, node, calleeNames)) {
      const arg = getFirstObjectArg(ts, node)
      if (arg) {
        const enfProp = getObjectProperty(ts, arg, 'enforcement')
        if (enfProp) {
          const enf = asObjectLiteralExpression(ts, enfProp.initializer)
          if (enf) cb(node, enf)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
}
