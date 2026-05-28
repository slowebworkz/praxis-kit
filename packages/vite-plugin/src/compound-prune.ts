/**
 * Compile-time dead compound variant pruning.
 *
 * Removes entries from `styling.compounds` whose conditions can never fire:
 *   - condition key is not in `styling.variants`
 *   - condition value (string) is not a valid value for that variant key
 *   - condition value (array) has no element that is a valid value
 *
 * Only entries whose conditions are all statically evaluable (string/array
 * literals throughout) are candidates for pruning — dynamic conditions (variable
 * references, computed values) are left unchanged.
 *
 * Returns null if no factory calls with `styling.compounds` are found, or if
 * every compound in every factory call passes the validity check.
 */
import ts from 'typescript'
import { asArray, asObject, firstObjectArg, getProperty, isFactoryCall, walk } from './ast'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a variant map from a `styling.variants` object literal.  */
function extractVariantMap(stylingObj: ts.ObjectLiteralExpression): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  const variantsObj = asObject(getProperty(stylingObj, 'variants'))
  if (!variantsObj) return result

  for (const prop of variantsObj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    const key =
      ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : undefined
    if (!key) continue
    const valuesObj = asObject(prop.initializer)
    if (!valuesObj) continue
    const valid = new Set<string>()
    for (const vp of valuesObj.properties) {
      if (!ts.isPropertyAssignment(vp)) continue
      const vk = ts.isIdentifier(vp.name) || ts.isStringLiteral(vp.name) ? vp.name.text : undefined
      if (vk) valid.add(vk)
    }
    result.set(key, valid)
  }
  return result
}

/**
 * Returns true if the compound object literal entry is dead given `variantMap`.
 *
 * Conservative: returns false (not dead) whenever a condition cannot be fully
 * evaluated as string/array literals.
 */
function isDeadCompound(
  entry: ts.ObjectLiteralExpression,
  variantMap: Map<string, Set<string>>,
): boolean {
  for (const prop of entry.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    const key =
      ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : undefined
    if (!key || key === 'class') continue

    const validValues = variantMap.get(key)
    if (!validValues) return true // unknown variant key — dead

    const val = prop.initializer
    if (ts.isStringLiteral(val)) {
      if (!validValues.has(val.text)) return true
    } else if (ts.isArrayLiteralExpression(val)) {
      // All elements must be string literals to evaluate; if any is non-literal, skip.
      const allLiterals = val.elements.every(ts.isStringLiteral)
      if (!allLiterals) continue
      const hasAnyValid = val.elements.some((e) => ts.isStringLiteral(e) && validValues.has(e.text))
      if (!hasAnyValid) return true // every value in the OR-list is invalid — dead
    }
    // Non-literal condition value → conservative: skip, not dead
  }
  return false
}

// ─── Transformer ──────────────────────────────────────────────────────────────

function createCompoundPruner(
  factory: ts.NodeFactory,
  calleeNames: ReadonlySet<string>,
  onPruned: () => void,
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    function visit(node: ts.Node): ts.Node {
      if (!ts.isCallExpression(node)) return ts.visitEachChild(node, visit, context)
      if (!isFactoryCall(node, calleeNames)) return ts.visitEachChild(node, visit, context)

      const arg = firstObjectArg(node)
      if (!arg) return node

      const stylingNode = getProperty(arg, 'styling')
      const stylingObj = asObject(stylingNode)
      if (!stylingObj) return ts.visitEachChild(node, visit, context)

      const compoundsNode = getProperty(stylingObj, 'compounds')
      const compoundsArr = asArray(compoundsNode)
      if (!compoundsArr || compoundsArr.elements.length === 0)
        return ts.visitEachChild(node, visit, context)

      const variantMap = extractVariantMap(stylingObj)
      if (variantMap.size === 0) return ts.visitEachChild(node, visit, context)

      const liveEntries = compoundsArr.elements.filter((elem) => {
        const obj = asObject(elem)
        return !obj || !isDeadCompound(obj, variantMap)
      })

      if (liveEntries.length === compoundsArr.elements.length)
        return ts.visitEachChild(node, visit, context)

      onPruned()

      // Rebuild styling object with pruned compounds array
      const newCompoundsArr = factory.createArrayLiteralExpression(liveEntries, true)
      const newStylingProps = stylingObj.properties.map((p) => {
        if (
          ts.isPropertyAssignment(p) &&
          (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
          p.name.text === 'compounds'
        ) {
          return factory.createPropertyAssignment(p.name, newCompoundsArr)
        }
        return p
      })
      const newStylingObj = factory.createObjectLiteralExpression(newStylingProps, true)
      const newArgProps = arg.properties.map((p) => {
        if (
          ts.isPropertyAssignment(p) &&
          (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
          p.name.text === 'styling'
        ) {
          return factory.createPropertyAssignment(p.name, newStylingObj)
        }
        return p
      })
      const newArg = factory.createObjectLiteralExpression(newArgProps, true)
      return factory.createCallExpression(node.expression, node.typeArguments, [
        newArg,
        ...node.arguments.slice(1),
      ])
    }

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context)
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Applies dead-compound pruning to the given TypeScript source file.
 *
 * Returns null when the file has no factory calls with `styling.compounds`, or
 * when every compound entry passes validity — i.e., when no pruning is needed.
 */
export function pruneDeadCompounds(
  source: ts.SourceFile,
  calleeNames: ReadonlySet<string>,
): string | null {
  let hasCompounds = false
  walk(source, (n) => {
    if (hasCompounds) return
    if (ts.isPropertyAssignment(n)) {
      const key = ts.isIdentifier(n.name) || ts.isStringLiteral(n.name) ? n.name.text : undefined
      if (key === 'compounds') hasCompounds = true
    }
  })
  if (!hasCompounds) return null

  let didPrune = false
  const result = ts.transform(
    source,
    [
      createCompoundPruner(ts.factory, calleeNames, () => {
        didPrune = true
      }),
    ],
    { target: ts.ScriptTarget.Latest },
  )

  if (!didPrune) {
    result.dispose()
    return null
  }

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false })
  const output = printer.printFile(result.transformed[0]!)
  result.dispose()
  return output
}
