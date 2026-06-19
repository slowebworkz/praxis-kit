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
import type { ImportBinding } from './imports'
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
 * default exports, and destructured patterns are not collected. Cross-file
 * constraint collection (factory defined in module A, consumed in module B)
 * is handled separately via the registry + import resolver path in the plugin.
 * Dynamic cardinality values (computed variables, spreads) are silently skipped;
 * extending to data-flow patterns is deferred.
 */
function processVariableStatement(
  node: ts.VariableStatement,
  calleeNames: ReadonlySet<string>,
  out: ComponentConstraint[],
): void {
  for (const decl of node.declarationList.declarations) {
    if (!decl.initializer || !ts.isCallExpression(decl.initializer)) continue
    if (!isFactoryCall(decl.initializer, calleeNames)) continue

    const arg = firstObjectArg(decl.initializer)
    if (!arg) continue

    // Extract default tag (top-level `tag: 'button'`).
    const tagNode = getProperty(arg, 'tag')
    const defaultTag = tagNode && ts.isStringLiteral(tagNode) ? tagNode.text : undefined

    // Check whether enforcement.aria is a non-empty array literal.
    const enforcementProp = getProperty(arg, 'enforcement')
    const enfObj = asObject(enforcementProp)
    const ariaNode = enfObj ? getProperty(enfObj, 'aria') : undefined
    const ariaArr = asArray(ariaNode)
    const hasAriaRules = ariaArr !== undefined && ariaArr.elements.length > 0

    const childrenProp = enfObj ? getProperty(enfObj, 'children') : undefined
    const childrenArr = asArray(childrenProp)

    const rules: StaticBound[] = []
    if (childrenArr) {
      for (const element of childrenArr.elements) {
        const bound = extractBound(element)
        if (bound) rules.push(bound)
      }
    }

    // Collect the constraint even when there are no children rules, if the component
    // has a default tag or ARIA rules — needed for the ARIA as-override check.
    if (rules.length === 0 && !hasAriaRules && !defaultTag) continue

    let totalMin = 0
    let totalMax = 0
    for (const rule of rules) {
      totalMin += cardinalityMin(rule.cardinality)
      const max = cardinalityMax(rule.cardinality)
      totalMax = totalMax === Infinity || max === Infinity ? Infinity : totalMax + max
    }

    const componentName = ts.isIdentifier(decl.name) ? decl.name.text : undefined
    if (!componentName) continue

    out.push({
      name: componentName,
      rules,
      totalMin,
      totalMax,
      ...(defaultTag !== undefined && { defaultTag }),
      hasAriaRules,
    })
  }
}

export function collectConstraints(
  source: ts.SourceFile,
  calleeNames: ReadonlySet<string>,
): ComponentConstraint[] {
  const constraints: ComponentConstraint[] = []
  walk(source, (node) => {
    if (ts.isVariableStatement(node)) processVariableStatement(node, calleeNames, constraints)
  })
  return constraints
}

/**
 * Single-pass variant of collectConstraints + extractImportSpecifiers.
 * Collects factory constraints and named import bindings in one AST walk
 * instead of two, for use in the hot Vite transform hook.
 */
export function collectFileDeclarations(
  source: ts.SourceFile,
  calleeNames: ReadonlySet<string>,
): { constraints: ComponentConstraint[]; importSpecifiers: Map<string, ImportBinding> } {
  const constraints: ComponentConstraint[] = []
  const importSpecifiers = new Map<string, ImportBinding>()

  walk(source, (node) => {
    if (ts.isVariableStatement(node)) {
      processVariableStatement(node, calleeNames, constraints)
    } else if (ts.isImportDeclaration(node)) {
      const spec = node.moduleSpecifier
      if (!ts.isStringLiteral(spec)) return
      const namedBindings = node.importClause?.namedBindings
      if (!namedBindings || !ts.isNamedImports(namedBindings)) return
      const specifier = spec.text
      for (const el of namedBindings.elements) {
        if (el.isTypeOnly) continue
        const localName = el.name.text
        const importedName = el.propertyName?.text ?? localName
        importSpecifiers.set(localName, { importedName, specifier })
      }
    }
  })

  return { constraints, importSpecifiers }
}
