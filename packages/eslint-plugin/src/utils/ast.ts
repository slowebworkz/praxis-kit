import type { TSESTree } from '@typescript-eslint/utils'

type NullableNode = TSESTree.Node | null | undefined

type Property = TSESTree.Property
type ObjectExpression = TSESTree.ObjectExpression
type ArrayExpression = TSESTree.ArrayExpression
type CallExpression = TSESTree.CallExpression

export function getObjectProperty(obj: ObjectExpression, key: string): Property | undefined {
  return obj.properties.find((prop): prop is Property => {
    if (prop.type !== 'Property' || prop.kind !== 'init' || prop.computed) {
      return false
    }

    const { key: propKey } = prop

    return (
      (propKey.type === 'Identifier' && propKey.name === key) ||
      (propKey.type === 'Literal' && propKey.value === key)
    )
  })
}

export function asObjectExpression(node: NullableNode): ObjectExpression | undefined {
  return node?.type === 'ObjectExpression' ? node : undefined
}

export function asArrayExpression(node: NullableNode): ArrayExpression | undefined {
  return node?.type === 'ArrayExpression' ? node : undefined
}

export function asNumericLiteral(node: NullableNode): number | undefined {
  if (node?.type === 'Literal') {
    const { value } = node

    if (typeof value === 'number') {
      return value
    }
  }

  // Negative and positive numeric literals:
  // -1 parses as UnaryExpression("-", Literal(1))
  // +1 parses as UnaryExpression("+", Literal(1))
  if (node?.type === 'UnaryExpression') {
    const { operator, argument } = node

    if (
      (operator === '-' || operator === '+') &&
      argument.type === 'Literal' &&
      typeof argument.value === 'number'
    ) {
      return operator === '-' ? -argument.value : argument.value
    }
  }

  return undefined
}

export function isFactoryCall(node: CallExpression, calleeNames: ReadonlySet<string>): boolean {
  const { callee } = node

  if (callee.type === 'Identifier') {
    return calleeNames.has(callee.name)
  }

  if (callee.type === 'MemberExpression' && !callee.computed) {
    const { property } = callee

    return property.type === 'Identifier' && calleeNames.has(property.name)
  }

  return false
}

export function getFirstObjectArg(node: CallExpression): ObjectExpression | undefined {
  const [first] = node.arguments

  return first?.type === 'ObjectExpression' ? first : undefined
}
