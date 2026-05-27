import ts from 'typescript'
import { walk } from './ast'
import type { ComponentConstraint, Diagnostic, PendingUsage, Severity } from './types'

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

  const byName = new Map(constraints.map((c) => [c.name, c]))
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
