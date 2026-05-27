import ts from 'typescript'
import {
  asArray,
  asObject,
  asPositiveInt,
  firstObjectArg,
  getProperty,
  isFactoryCall,
  walk,
} from './ast'
import type { Cardinality, ChildRulePosition, ComponentConstraint, StaticBound } from './types'

/**
 * Extracts a StaticBound from one element of the enforcement.children array,
 * if and only if the element is an object literal with a statically-readable
 * cardinality. Returns undefined for elements that use dynamic values.
 */
function extractBound(element: ts.Expression): StaticBound | undefined {
  const obj = asObject(element)
  if (!obj) return undefined

  const cardinalityNode = getProperty(obj, 'cardinality')
  const cardObj = asObject(cardinalityNode)

  let cardinality: Cardinality

  if (cardObj) {
    const minNode = getProperty(cardObj, 'min')
    const maxNode = getProperty(cardObj, 'max')
    const min = asPositiveInt(minNode) ?? 0
    const max = asPositiveInt(maxNode)

    if (min === 0 && max === undefined) {
      cardinality = { kind: 'unbounded' }
    } else {
      cardinality = { kind: 'bounded', min, max: max ?? Infinity }
    }
  } else {
    // No cardinality object → unbounded (matches runtime normalizeChildRule default)
    cardinality = { kind: 'unbounded' }
  }

  const positionNode = getProperty(obj, 'position')
  let position: ChildRulePosition = 'any'
  if (positionNode && ts.isStringLiteral(positionNode)) {
    const p = positionNode.text
    if (p === 'first' || p === 'last' || p === 'any') position = p
  }

  return { cardinality, position }
}

function cardinalityMin(c: Cardinality): number {
  return c.kind === 'bounded' ? c.min : 0
}

function cardinalityMax(c: Cardinality): number {
  return c.kind === 'bounded' ? c.max : Infinity
}

/**
 * Walks a SourceFile and returns one ComponentConstraint for each
 * `const X = createPolymorphicComponent({ enforcement: { children: [...] } })`
 * where at least one children rule has a statically-extractable cardinality.
 *
 * Only handles simple `const X = factory(...)` declarations — named exports,
 * default exports, and destructured patterns are not collected (cross-file
 * analysis is out of scope for the prototype).
 */
export function collectConstraints(
  source: ts.SourceFile,
  calleeNames: ReadonlySet<string>,
): ComponentConstraint[] {
  const constraints: ComponentConstraint[] = []

  walk(source, (node) => {
    if (!ts.isVariableStatement(node)) return

    for (const decl of node.declarationList.declarations) {
      if (!decl.initializer || !ts.isCallExpression(decl.initializer)) continue
      if (!isFactoryCall(decl.initializer, calleeNames)) continue

      const arg = firstObjectArg(decl.initializer)
      if (!arg) continue

      const enforcementProp = getProperty(arg, 'enforcement')
      const enfObj = asObject(enforcementProp)
      if (!enfObj) continue

      const childrenProp = getProperty(enfObj, 'children')
      const childrenArr = asArray(childrenProp)
      if (!childrenArr) continue

      const rules: StaticBound[] = []
      for (const element of childrenArr.elements) {
        const bound = extractBound(element)
        if (bound) rules.push(bound)
      }

      if (rules.length === 0) continue

      const totalMin = rules.reduce((s, r) => s + cardinalityMin(r.cardinality), 0)
      const totalMax = rules.reduce(
        (s, r) => (s === Infinity ? Infinity : s + cardinalityMax(r.cardinality)),
        0,
      )

      const componentName = ts.isIdentifier(decl.name) ? decl.name.text : undefined
      if (!componentName) continue

      constraints.push({ name: componentName, rules, totalMin, totalMax })
    }
  })

  return constraints
}
