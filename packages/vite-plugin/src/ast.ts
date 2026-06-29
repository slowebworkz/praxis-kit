import ts from 'typescript'
import { iterate } from '@praxis-kit/primitive'

/** Returns the value of a named property in an object literal, or undefined. */
export function getProperty(
  obj: ts.ObjectLiteralExpression,
  key: string,
): ts.Expression | undefined {
  return (
    iterate.find(obj.properties, (prop) => {
      if (!ts.isPropertyAssignment(prop)) return null

      const { name } = prop
      if ((ts.isIdentifier(name) || ts.isStringLiteral(name)) && name.text === key)
        return prop.initializer

      return null
    }) ?? undefined
  )
}

/** Narrows to ObjectLiteralExpression or returns undefined. */
export function asObject(node: ts.Node | undefined): ts.ObjectLiteralExpression | undefined {
  if (!node) return undefined
  return ts.isObjectLiteralExpression(node) ? node : undefined
}

/** Narrows to ArrayLiteralExpression or returns undefined. */
export function asArray(node: ts.Node | undefined): ts.ArrayLiteralExpression | undefined {
  if (!node) return undefined
  return ts.isArrayLiteralExpression(node) ? node : undefined
}

/**
 * Extracts a non-negative integer from a numeric literal node.
 * Handles plain literals (42) and prefix-minus expressions (-1, rejected as negative).
 */
export function asPositiveInt(node: ts.Node | undefined): number | undefined {
  if (!node) return undefined
  if (ts.isNumericLiteral(node)) {
    const n = Number(node.text)
    return Number.isFinite(n) && n >= 0 ? n : undefined
  }
  return undefined
}

/** Returns true if the call expression's callee matches one of the given names. */
export function isFactoryCall(call: ts.CallExpression, names: ReadonlySet<string>): boolean {
  const { expression } = call
  if (ts.isIdentifier(expression)) return names.has(expression.text)
  if (ts.isPropertyAccessExpression(expression)) return names.has(expression.name.text)
  return false
}

/** Returns the first argument of a call if it is an object literal. */
export function firstObjectArg(call: ts.CallExpression): ts.ObjectLiteralExpression | undefined {
  const [first] = call.arguments
  return first && ts.isObjectLiteralExpression(first) ? first : undefined
}

/** Visits every node in a subtree depth-first, yielding each. */
export function* walk(node: ts.Node): IterableIterator<ts.Node> {
  yield node
  const children: ts.Node[] = []
  ts.forEachChild(node, (child) => {
    children.push(child)
  })
  for (const child of children) {
    yield* walk(child)
  }
}

/** Visits every node in a subtree depth-first, calling visitor for each. */
export function walkEach(node: ts.Node, visitor: (node: ts.Node) => void): void {
  for (const child of walk(node)) {
    visitor(child)
  }
}

/** Parses source text as TSX and returns a SourceFile. */
export function parseSource(filename: string, code: string): ts.SourceFile {
  return ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}
