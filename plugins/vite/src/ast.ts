import ts from 'typescript'
import { iterate } from '@praxis-kit/primitive'

/**
 * Returns the initializer of a named property from an object literal.
 *
 * Only direct `PropertyAssignment` nodes are considered. Shorthand
 * properties, spread assignments, getters, setters, and methods are ignored.
 *
 * @param obj Object literal to search.
 * @param key Property name to locate.
 * @returns The property's initializer expression, or `undefined` if the
 * property is not present or is not a standard property assignment.
 */
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

/**
 * Narrows a node to an ObjectLiteralExpression.
 *
 * This is a convenience type guard for optional AST nodes.
 *
 * @param node Node to inspect.
 * @returns The same node when it is an object literal; otherwise `undefined`.
 */
export function asObject(node: ts.Node | undefined): ts.ObjectLiteralExpression | undefined {
  if (!node) return undefined
  return ts.isObjectLiteralExpression(node) ? node : undefined
}

/**
 * Narrows a node to an ArrayLiteralExpression.
 *
 * @param node Node to inspect.
 * @returns The same node when it is an array literal; otherwise `undefined`.
 */
export function asArray(node: ts.Node | undefined): ts.ArrayLiteralExpression | undefined {
  if (!node) return undefined
  return ts.isArrayLiteralExpression(node) ? node : undefined
}

/**
 * Extracts a non-negative integer from a numeric literal.
 *
 * Accepts only literal numeric values present in the AST.
 * Expressions such as `1 + 2`, identifiers, and function calls
 * are intentionally ignored.
 *
 * @remarks
 * This helper does not evaluate constant expressions. It only
 * reads literal values already present in the syntax tree.
 *
 * @param node Node to inspect.
 * @returns A non-negative integer, or `undefined` when the node
 * is not a numeric literal or represents a negative value.
 */
export function asNonNegativeInt(node: ts.Node | undefined): number | undefined {
  if (!node) return undefined
  if (ts.isNumericLiteral(node)) {
    const n = Number(node.text)
    return Number.isFinite(n) && n >= 0 ? n : undefined
  }
  return undefined
}

/**
 * Extracts a boolean literal from an AST node.
 *
 * Only the `true` and `false` keyword nodes are recognized.
 *
 * @param node Node to inspect.
 * @returns `true`, `false`, or `undefined`.
 */
export function asBooleanLiteral(node: ts.Node | undefined): boolean | undefined {
  if (!node) return undefined
  switch (node.kind) {
    case ts.SyntaxKind.TrueKeyword:
      return true
    case ts.SyntaxKind.FalseKeyword:
      return false
    default:
      return undefined
  }
}

/**
 * Determines whether a call expression invokes one of the known
 * Praxis Kit factory functions.
 *
 * Supports both direct identifiers and property access expressions.
 *
 * Examples:
 *
 * ```ts
 * defineComponent(...)
 * factory.defineComponent(...)
 * ```
 *
 * @param call Call expression to inspect.
 * @param names Set of accepted factory names.
 * @returns `true` when the call targets one of the supplied names.
 */
export function isFactoryCall(call: ts.CallExpression, names: ReadonlySet<string>): boolean {
  const { expression } = call
  if (ts.isIdentifier(expression)) return names.has(expression.text)
  if (ts.isPropertyAccessExpression(expression)) return names.has(expression.name.text)
  return false
}

/**
 * Returns the first argument when it is an object literal.
 *
 * Useful for parsing APIs that accept an options object as their
 * first parameter.
 *
 * @param call Call expression to inspect.
 * @returns The first argument if it is an object literal;
 * otherwise `undefined`.
 */
export function firstObjectArg(call: ts.CallExpression): ts.ObjectLiteralExpression | undefined {
  const first = call.arguments[0]
  return first && ts.isObjectLiteralExpression(first) ? first : undefined
}

/**
 * Performs a depth-first traversal of an AST subtree.
 *
 * The starting node is yielded first, followed by every
 * descendant in lexical order.
 *
 * @remarks
 * This is implemented as a generator, allowing consumers to
 * iterate lazily using `for...of`.
 *
 * @param node Root node.
 * @returns An iterator over every node in the subtree.
 */
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

/**
 * Traverses an AST subtree depth-first, invoking a visitor for
 * every node encountered.
 *
 * This is a callback-oriented alternative to {@link walk}.
 *
 * @param node Root node.
 * @param visitor Function invoked for every visited node.
 */
export function walkEach(node: ts.Node, visitor: (node: ts.Node) => void): void {
  for (const child of walk(node)) {
    visitor(child)
  }
}

/**
 * Parses source text into a TypeScript SourceFile.
 *
 * Source is always parsed as TSX using the latest supported
 * language version with parent pointers enabled.
 *
 * @param filename Virtual filename used for diagnostics.
 * @param code Source code to parse.
 * @returns Parsed SourceFile.
 */
export function parseSource(filename: string, code: string): ts.SourceFile {
  return ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}
