import ts from 'typescript'
import { walk } from './ast'
import type { ComponentConstraint, Diagnostic, PendingUsage, Severity } from './types'

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
    let count: number | undefined

    if (ts.isJsxElement(node)) {
      const opening = node.openingElement
      tagName = ts.isIdentifier(opening.tagName) ? opening.tagName.text : undefined
      attributes = opening.attributes
      count = countStaticChildren(node)
    } else if (ts.isJsxSelfClosingElement(node)) {
      tagName = ts.isIdentifier(node.tagName) ? node.tagName.text : undefined
      attributes = node.attributes
      count = 0
    }

    if (!tagName) return

    // Lazy — computed once and shared across all three checks if needed.
    let pos: ts.LineAndCharacter | undefined
    const getPos = () => (pos ??= source.getLineAndCharacterOfPosition(node.getStart(source)))

    // 1. Cardinality diagnostics
    if (count !== undefined) {
      const c = byName.get(tagName)
      if (c && (count < c.totalMin || count > c.totalMax)) {
        const { line, character } = getPos()
        const { totalMin, totalMax, name } = c
        const rangeText =
          totalMax === Infinity
            ? `at least ${totalMin}`
            : totalMin === totalMax
              ? `exactly ${totalMin}`
              : `${totalMin}–${totalMax}`
        diagnostics.push({
          message: `<${name}> expects ${rangeText} ${totalMax === 1 && totalMin === 1 ? 'child' : 'children'} but received ${count}.`,
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

/**
 * Returns the count of meaningful JSX children — JSX elements and non-whitespace
 * text — in a JSX element's children array. JSX expressions (`{...}`) make the
 * count unknowable and signal that the site is not statically analyzable.
 *
 * Returns undefined when any child is a JsxExpression (dynamic content).
 */
function countStaticChildren(node: ts.JsxElement): number | undefined {
  let count = 0
  for (const child of node.children) {
    if (ts.isJsxExpression(child)) return undefined
    if (ts.isJsxText(child)) {
      if (child.text.trim().length > 0) count++
    } else {
      // JsxElement, JsxSelfClosingElement, JsxFragment
      count++
    }
  }
  return count
}

/**
 * Given a SourceFile and the set of component constraints collected from the
 * same file, walks all JSX usages and emits a Diagnostic for each site where:
 * - The JSX element's tag matches a known constrained component name
 * - All children are statically known (no JSX expressions)
 * - The child count is outside the [totalMin, totalMax] range
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
    // Handle both <Foo>...</Foo> (JsxElement) and <Foo /> (JsxSelfClosingElement).
    let tagName: string | undefined
    let count: number | undefined

    if (ts.isJsxElement(node)) {
      const openTag = node.openingElement
      tagName = ts.isIdentifier(openTag.tagName) ? openTag.tagName.text : undefined
      count = countStaticChildren(node)
    } else if (ts.isJsxSelfClosingElement(node)) {
      tagName = ts.isIdentifier(node.tagName) ? node.tagName.text : undefined
      count = 0 // self-closing always has zero children
    }

    if (!tagName) return

    const constraint = byName.get(tagName)
    if (!constraint) return

    if (count === undefined) return // dynamic children — skip

    const { totalMin, totalMax, name } = constraint

    if (count < totalMin || count > totalMax) {
      const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source))
      const rangeText =
        totalMax === Infinity
          ? `at least ${totalMin}`
          : totalMin === totalMax
            ? `exactly ${totalMin}`
            : `${totalMin}–${totalMax}`
      diagnostics.push({
        message: `<${name}> expects ${rangeText} ${totalMax === 1 && totalMin === 1 ? 'child' : 'children'} but received ${count}.`,
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
    let count: number | undefined

    if (ts.isJsxElement(node)) {
      const openTag = node.openingElement
      tagName = ts.isIdentifier(openTag.tagName) ? openTag.tagName.text : undefined
      count = countStaticChildren(node)
    } else if (ts.isJsxSelfClosingElement(node)) {
      tagName = ts.isIdentifier(node.tagName) ? node.tagName.text : undefined
      count = 0
    }

    if (!tagName || !/^[A-Z]/.test(tagName)) return

    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source))
    usages.push({ tagName, count, line: line + 1, col: character + 1 })
  })

  return usages
}
