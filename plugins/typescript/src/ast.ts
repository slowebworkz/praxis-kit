import type tsserverlibrary from 'typescript/lib/tsserverlibrary'

type TS = typeof tsserverlibrary

export function getObjectProperty(
  ts: TS,
  obj: tsserverlibrary.ObjectLiteralExpression,
  key: string,
): tsserverlibrary.PropertyAssignment | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    const name = prop.name
    if (ts.isIdentifier(name) && name.text === key) return prop
    if (ts.isStringLiteral(name) && name.text === key) return prop
  }
  return undefined
}

export function asObjectLiteralExpression(
  ts: TS,
  node: tsserverlibrary.Node | undefined,
): tsserverlibrary.ObjectLiteralExpression | undefined {
  if (!node) return undefined
  return ts.isObjectLiteralExpression(node) ? node : undefined
}

export function asArrayLiteralExpression(
  ts: TS,
  node: tsserverlibrary.Node | undefined,
): tsserverlibrary.ArrayLiteralExpression | undefined {
  if (!node) return undefined
  return ts.isArrayLiteralExpression(node) ? node : undefined
}

export function asNumericValue(ts: TS, node: tsserverlibrary.Node | undefined): number | undefined {
  if (!node) return undefined
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (
    ts.isPrefixUnaryExpression(node) &&
    (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken) &&
    ts.isNumericLiteral(node.operand)
  ) {
    const val = Number(node.operand.text)
    return node.operator === ts.SyntaxKind.MinusToken ? -val : val
  }
  return undefined
}

export function isFactoryCall(
  ts: TS,
  node: tsserverlibrary.CallExpression,
  names: ReadonlySet<string>,
): boolean {
  const { expression } = node
  if (ts.isIdentifier(expression)) return names.has(expression.text)
  if (ts.isPropertyAccessExpression(expression)) return names.has(expression.name.text)
  return false
}

export function getFirstObjectArg(
  ts: TS,
  node: tsserverlibrary.CallExpression,
): tsserverlibrary.ObjectLiteralExpression | undefined {
  const [first] = node.arguments
  if (!first) return undefined
  return ts.isObjectLiteralExpression(first) ? first : undefined
}
