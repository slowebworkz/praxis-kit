import ts from 'typescript'
import { walk } from './ast'
import type { ChildCount, ComponentConstraint, Diagnostic, PendingUsage, Severity } from './types'

/**
 * Single-pass variant of diagnoseUsages + diagnoseAriaTagOverrides + collectJsxUsages.
 * Visits each JSX node once and dispatches to all three checks, rather than walking
 * the source three times. For use in the hot Vite transform hook.
 */
export function analyzeJsxSites(
  source: ts.SourceFile,
  constraints: ComponentConstraint[],
  severity: Severity,
): { diagnostics: Diagnostic[]; usages: PendingUsage[] } {
  const byName = new Map(constraints.filter((c) => c.rules.length > 0).map((c) => [c.name, c]))
  const byNameAria = new Map(
    constraints.filter((c) => c.hasAriaRules && c.defaultTag !== undefined).map((c) => [c.name, c]),
  )
  const diagnostics: Diagnostic[] = []
  const usages: PendingUsage[] = []

  walk(source, (node) => {
    let tagName: string | undefined
    let attributes: ts.JsxAttributes | undefined
    let count: ChildCount | undefined

    if (ts.isJsxElement(node)) {
      const opening = node.openingElement
      tagName = ts.isIdentifier(opening.tagName) ? opening.tagName.text : undefined
      attributes = opening.attributes
      count = countJsxChildren(node.children)
    } else if (ts.isJsxSelfClosingElement(node)) {
      tagName = ts.isIdentifier(node.tagName) ? node.tagName.text : undefined
      attributes = node.attributes
      count = ZERO
    }

    if (!tagName) return

    // Lazy — computed once and shared across all three checks if needed.
    let pos: ts.LineAndCharacter | undefined
    const getPos = () => (pos ??= source.getLineAndCharacterOfPosition(node.getStart(source)))

    // 1. Cardinality diagnostics — fire only when the count range is certainly outside bounds.
    if (count !== undefined) {
      const c = byName.get(tagName)
      if (c && (count.max < c.totalMin || count.min > c.totalMax)) {
        const { line, character } = getPos()
        const { totalMin, totalMax, name } = c
        const rangeText =
          totalMax === Infinity
            ? `at least ${totalMin}`
            : totalMin === totalMax
              ? `exactly ${totalMin}`
              : `${totalMin}–${totalMax}`
        const receivedText = count.min === count.max ? `${count.min}` : `${count.min}–${count.max}`
        diagnostics.push({
          message: `<${name}> expects ${rangeText} ${totalMax === 1 && totalMin === 1 ? 'child' : 'children'} but received ${receivedText}.`,
          line: line + 1,
          col: character + 1,
          severity,
        })
      }
    }

    // 2. ARIA tag-override diagnostics
    if (attributes) {
      const c = byNameAria.get(tagName)
      if (c) {
        for (const attr of attributes.properties) {
          if (!ts.isJsxAttribute(attr)) continue
          const attrName = ts.isIdentifier(attr.name) ? attr.name.text : undefined
          if (attrName !== 'as' || !attr.initializer) continue
          let asValue: string | undefined
          if (ts.isStringLiteral(attr.initializer)) {
            asValue = attr.initializer.text
          } else if (
            ts.isJsxExpression(attr.initializer) &&
            attr.initializer.expression !== undefined &&
            ts.isStringLiteral(attr.initializer.expression)
          ) {
            asValue = attr.initializer.expression.text
          }
          if (asValue !== undefined && asValue !== c.defaultTag) {
            const { line, character } = getPos()
            diagnostics.push({
              message: `<${tagName} as="${asValue}"> changes the element type from '${c.defaultTag}' — ARIA enforcement rules may not apply as expected.`,
              line: line + 1,
              col: character + 1,
              severity,
            })
          }
        }
      }
    }

    // 3. Cross-file usage collection
    if (/^[A-Z]/.test(tagName)) {
      const { line, character } = getPos()
      usages.push({ tagName, count, line: line + 1, col: character + 1 })
    }
  })

  return { diagnostics, usages }
}

// ─── Child count analysis ─────────────────────────────────────────────────────

const ZERO: ChildCount = { min: 0, max: 0 }
const ONE: ChildCount = { min: 1, max: 1 }

/**
 * Analyzes an expression to determine how many JSX children it renders.
 *
 * Returns a `ChildCount` range when the count is statically determinable —
 * including partially-dynamic patterns like conditionals and array literals.
 * Returns `undefined` for unknowable cases (`.map()`, variable references,
 * spread elements).
 *
 * Handles:
 * - `null`, `false`, `undefined`, empty `{}` → 0
 * - `cond && <El />` → [0, 1]
 * - `cond || <El />` / `cond ?? <El />` → [min(sides), max(sides)]
 * - `cond ? <A /> : <B />` → [min(branches), max(branches)]
 * - `[<A />, <B />]` (no spreads) → exact array count
 * - JSX element / fragment → 1 / fragment child count
 * - Parenthesized expressions → delegate to inner
 */
function countExpression(node: ts.Expression): ChildCount | undefined {
  if (node.kind === ts.SyntaxKind.NullKeyword) return ZERO
  if (node.kind === ts.SyntaxKind.FalseKeyword) return ZERO
  if (ts.isIdentifier(node) && node.text === 'undefined') return ZERO

  if (ts.isParenthesizedExpression(node)) return countExpression(node.expression)

  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) return ONE

  // Fragments flatten — their children count, not the fragment wrapper itself.
  if (ts.isJsxFragment(node)) return countJsxChildren(node.children)

  if (ts.isArrayLiteralExpression(node)) {
    let min = 0
    let max = 0
    for (const el of node.elements) {
      if (ts.isSpreadElement(el)) return undefined
      const c = countExpression(el)
      if (!c) return undefined
      min += c.min
      max += c.max
    }
    return { min, max }
  }

  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) {
      const right = countExpression(node.right)
      if (!right) return undefined
      return { min: 0, max: right.max }
    }
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      const left = countExpression(node.left)
      const right = countExpression(node.right)
      if (!left || !right) return undefined
      return { min: Math.min(left.min, right.min), max: Math.max(left.max, right.max) }
    }
  }

  if (ts.isConditionalExpression(node)) {
    const whenTrue = countExpression(node.whenTrue)
    const whenFalse = countExpression(node.whenFalse)
    if (!whenTrue || !whenFalse) return undefined
    return {
      min: Math.min(whenTrue.min, whenFalse.min),
      max: Math.max(whenTrue.max, whenFalse.max),
    }
  }

  return undefined
}

/**
 * Counts the meaningful children of a JSX element's child list.
 * Whitespace-only `JsxText` nodes are ignored. Fragments are flattened.
 * Returns `undefined` if any child contribution is unknowable.
 */
function countJsxChildren(children: ts.NodeArray<ts.JsxChild>): ChildCount | undefined {
  let min = 0
  let max = 0
  for (const child of children) {
    let c: ChildCount | undefined
    if (ts.isJsxExpression(child)) {
      c = child.expression === undefined ? ZERO : countExpression(child.expression)
    } else if (ts.isJsxText(child)) {
      c = child.text.trim().length > 0 ? ONE : ZERO
    } else if (ts.isJsxFragment(child)) {
      c = countJsxChildren(child.children)
    } else {
      c = ONE // JsxElement, JsxSelfClosingElement
    }
    if (!c) return undefined
    min += c.min
    max += c.max
  }
  return { min, max }
}

/**
 * Given a SourceFile and the set of component constraints collected from the
 * same file, walks all JSX usages and emits a Diagnostic for each site where
 * the child count range is certainly outside the [totalMin, totalMax] bounds.
 */
export function diagnoseUsages(
  source: ts.SourceFile,
  constraints: ComponentConstraint[],
  severity: Severity,
): Diagnostic[] {
  if (constraints.length === 0) return []

  const byName = new Map(constraints.filter((c) => c.rules.length > 0).map((c) => [c.name, c]))
  const diagnostics: Diagnostic[] = []

  walk(source, (node) => {
    let tagName: string | undefined
    let count: ChildCount | undefined

    if (ts.isJsxElement(node)) {
      const openTag = node.openingElement
      tagName = ts.isIdentifier(openTag.tagName) ? openTag.tagName.text : undefined
      count = countJsxChildren(node.children)
    } else if (ts.isJsxSelfClosingElement(node)) {
      tagName = ts.isIdentifier(node.tagName) ? node.tagName.text : undefined
      count = ZERO
    }

    if (!tagName) return

    const constraint = byName.get(tagName)
    if (!constraint) return

    if (count === undefined) return // unknowable (e.g. .map(), variable reference)

    const { totalMin, totalMax, name } = constraint

    if (count.max < totalMin || count.min > totalMax) {
      const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source))
      const rangeText =
        totalMax === Infinity
          ? `at least ${totalMin}`
          : totalMin === totalMax
            ? `exactly ${totalMin}`
            : `${totalMin}–${totalMax}`
      const receivedText = count.min === count.max ? `${count.min}` : `${count.min}–${count.max}`
      diagnostics.push({
        message: `<${name}> expects ${rangeText} ${totalMax === 1 && totalMin === 1 ? 'child' : 'children'} but received ${receivedText}.`,
        line: line + 1,
        col: character + 1,
        severity,
      })
    }
  })

  return diagnostics
}

/**
 * Walks a source file and emits a diagnostic for each JSX usage of a
 * constrained component where a static `as="tag"` prop overrides the default
 * element type on a component that has ARIA enforcement rules.
 *
 * Changing the element type silently changes the implicit ARIA role, which can
 * cause ARIA rules to behave unexpectedly. This is not a hard error — the
 * override may be intentional — but it surfaces a site that warrants review.
 */
export function diagnoseAriaTagOverrides(
  source: ts.SourceFile,
  constraints: ComponentConstraint[],
  severity: Severity,
): Diagnostic[] {
  const byName = new Map(
    constraints.filter((c) => c.hasAriaRules && c.defaultTag !== undefined).map((c) => [c.name, c]),
  )
  if (byName.size === 0) return []

  const diagnostics: Diagnostic[] = []

  walk(source, (node) => {
    let tagName: string | undefined
    let attributes: ts.JsxAttributes | undefined

    if (ts.isJsxElement(node)) {
      tagName = ts.isIdentifier(node.openingElement.tagName)
        ? node.openingElement.tagName.text
        : undefined
      attributes = node.openingElement.attributes
    } else if (ts.isJsxSelfClosingElement(node)) {
      tagName = ts.isIdentifier(node.tagName) ? node.tagName.text : undefined
      attributes = node.attributes
    }

    if (!tagName || !attributes) return

    const constraint = byName.get(tagName)
    if (!constraint) return

    for (const attr of attributes.properties) {
      if (!ts.isJsxAttribute(attr)) continue
      const attrName = ts.isIdentifier(attr.name) ? attr.name.text : undefined
      if (attrName !== 'as') continue
      if (!attr.initializer) continue

      let asValue: string | undefined
      if (ts.isStringLiteral(attr.initializer)) {
        asValue = attr.initializer.text
      } else if (
        ts.isJsxExpression(attr.initializer) &&
        attr.initializer.expression !== undefined &&
        ts.isStringLiteral(attr.initializer.expression)
      ) {
        asValue = attr.initializer.expression.text
      }

      if (asValue === undefined || asValue === constraint.defaultTag) continue

      const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source))
      diagnostics.push({
        message: `<${tagName} as="${asValue}"> changes the element type from '${constraint.defaultTag}' — ARIA enforcement rules may not apply as expected.`,
        line: line + 1,
        col: character + 1,
        severity,
      })
    }
  })

  return diagnostics
}

/**
 * Walks a source file and collects every uppercase-tag JSX usage as a
 * PendingUsage. Used by the plugin to build the cross-file validation queue:
 * usages whose tag name is not locally defined are deferred until `buildEnd`
 * when the full constraint registry is available.
 */
export function collectJsxUsages(source: ts.SourceFile): PendingUsage[] {
  const usages: PendingUsage[] = []

  walk(source, (node) => {
    let tagName: string | undefined
    let count: ChildCount | undefined

    if (ts.isJsxElement(node)) {
      const openTag = node.openingElement
      tagName = ts.isIdentifier(openTag.tagName) ? openTag.tagName.text : undefined
      count = countJsxChildren(node.children)
    } else if (ts.isJsxSelfClosingElement(node)) {
      tagName = ts.isIdentifier(node.tagName) ? node.tagName.text : undefined
      count = ZERO
    }

    if (!tagName || !/^[A-Z]/.test(tagName)) return

    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source))
    usages.push({ tagName, count, line: line + 1, col: character + 1 })
  })

  return usages
}
