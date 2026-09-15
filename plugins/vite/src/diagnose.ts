import { isDefined, isUndefined, iterate } from '@praxis-kit/primitive'
import ts from 'typescript'
import { walkEach } from './ast'
import { getJsxTagName, isComponentTagName } from './jsx'
import type { ChildCount, ComponentConstraint, Diagnostic, PendingUsage, Severity } from './types'
import { ViteDiagnostics } from './vite-diagnostics'

// ─── JSX-site extraction ───────────────────────────────────────────────────────

/** The common shape every check below needs from a JSX usage site, regardless of whether it's an
 *  open-close element or a self-closing one. `count` stays optional (not just `attributes`'s own
 *  requiredness) because a self-closing element's count is always the known `ZERO`, while an
 *  open-close element's count can genuinely be unknowable (`.map()`, a variable reference) — that
 *  distinction ("no children at all" vs "children present but not statically countable") matters
 *  to callers like the cardinality check, so it isn't collapsed away here. */
interface JsxSite {
  readonly tagName: string
  readonly attributes: ts.JsxAttributes
  readonly count?: ChildCount
}

/** Extracts a {@link JsxSite} from a node, or `undefined` when the node isn't a JSX element/
 *  self-closing element, or its tag name isn't a plain identifier (e.g. `<foo.Bar />`). Centralizes
 *  the open-vs-self-closing branch every JSX-walking function in this file otherwise repeated. */
function getJsxSite(node: ts.Node): JsxSite | undefined {
  if (ts.isJsxElement(node)) {
    const opening = node.openingElement
    const tagName = getJsxTagName(opening.tagName)
    if (isUndefined(tagName)) return undefined
    const count = countJsxChildren(node.children)
    return isUndefined(count)
      ? { tagName, attributes: opening.attributes }
      : { tagName, attributes: opening.attributes, count }
  }
  if (ts.isJsxSelfClosingElement(node)) {
    const tagName = getJsxTagName(node.tagName)
    if (isUndefined(tagName)) return undefined
    return { tagName, attributes: node.attributes, count: ZERO }
  }
  return undefined
}

// ─── Child count analysis ─────────────────────────────────────────────────────

const ZERO = { min: 0, max: 0 } as const
const ONE = { min: 1, max: 1 } as const

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
      if (isUndefined(right)) return undefined
      return { min: 0, max: right.max }
    }
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      const left = countExpression(node.left)
      const right = countExpression(node.right)
      if (isUndefined(left) || isUndefined(right)) return undefined
      return { min: Math.min(left.min, right.min), max: Math.max(left.max, right.max) }
    }
  }

  if (ts.isConditionalExpression(node)) {
    const whenTrue = countExpression(node.whenTrue)
    const whenFalse = countExpression(node.whenFalse)
    if (isUndefined(whenTrue) || isUndefined(whenFalse)) return undefined
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
      c = isUndefined(child.expression) ? ZERO : countExpression(child.expression)
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

// ─── Individual diagnostics (pure, one JsxSite at a time) ─────────────────────
//
// Each of these looks at one already-extracted JsxSite and either finds nothing to report
// (returns undefined / an empty array) or builds the Diagnostic(s)/PendingUsage itself,
// computing the node's line/column only when it actually has something to emit — a real
// diagnostic is the exception at a usage site, not the rule, so there's no shared position
// value worth precomputing or memoizing up front (a plain
// `source.getLineAndCharacterOfPosition` call is cheap next to the AST walk itself, and
// inlining it here instead of routing it through a `lazy()` reads more directly for what's a
// handful of extra calls on the rare node that trips more than one check). `analyzeJsxSites`
// (single walk) and the three legacy exports below (each their own walk, kept for standalone/
// programmatic use — see `analyze.ts`'s use of `diagnoseUsages` and each export's own doc
// comment) both call the same three functions, so there's exactly one implementation of each
// check regardless of which walk drives it.

/** "Too many"/"too few" children for a component with a closed or minimum-bound children
 *  contract. Only fires when `constraint` is present and `site.count` is statically known —
 *  an unknowable count (`.map()`, a variable reference) is never treated as a violation. */
function diagnoseCardinality(
  source: ts.SourceFile,
  node: ts.Node,
  site: JsxSite,
  constraint: ComponentConstraint | undefined,
  severity: Severity,
): Diagnostic | undefined {
  if (isUndefined(constraint) || isUndefined(site.count)) return undefined
  const { count } = site
  const { totalMin, totalMax, name, exclusiveChildren } = constraint

  // "Too many" only applies when the component closes its children set — enforcement.children
  // is open-by-default, so extra unmatched children are otherwise allowed regardless of totalMax.
  if (count.max < totalMin || (exclusiveChildren && count.min > totalMax)) {
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source))
    return {
      diagnostic: ViteDiagnostics.cardinalityViolation(
        name,
        totalMin,
        totalMax,
        count.min,
        count.max,
      ),
      line: line + 1,
      col: character + 1,
      severity,
    }
  }
  return undefined
}

/** A static `as="tag"` prop that overrides the default element on a component with ARIA
 *  enforcement rules — not a hard error (the override may be intentional), just a site that
 *  warrants review since it silently changes the implicit ARIA role. Only fires when
 *  `constraint` is present; a dynamic/absent `as` is never flagged. */
function diagnoseAriaOverride(
  source: ts.SourceFile,
  node: ts.Node,
  site: JsxSite,
  constraint: ComponentConstraint | undefined,
  severity: Severity,
): Diagnostic[] {
  if (!constraint) return []
  const diagnostics: Diagnostic[] = []

  iterate.forEach(site.attributes.properties, (attr) => {
    if (!ts.isJsxAttribute(attr)) return

    const { initializer, name } = attr
    const attrName = ts.isIdentifier(name) ? name.text : undefined
    if (attrName !== 'as' || isUndefined(initializer)) return

    let asValue: string | undefined
    if (ts.isStringLiteral(initializer)) {
      asValue = initializer.text
    } else if (
      ts.isJsxExpression(initializer) &&
      isDefined(initializer.expression) &&
      ts.isStringLiteral(initializer.expression)
    ) {
      asValue = initializer.expression.text
    }

    if (isUndefined(asValue) || asValue === constraint.defaultTag) return

    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source))
    diagnostics.push({
      diagnostic: ViteDiagnostics.ariaTagOverride(site.tagName, asValue, constraint.defaultTag!),
      line: line + 1,
      col: character + 1,
      severity,
    })
  })

  return diagnostics
}

/**
 * Collects `site` as a `PendingUsage` for the cross-file validation queue, when its tag name
 * looks like a component reference (uppercase-led). Intentionally over-inclusive — it doesn't
 * check whether the tag resolves to an actual known Praxis component (that's exactly what
 * deferred cross-file validation at `buildEnd`, once the full constraint registry is
 * populated, still needs to determine); an intrinsic HTML tag (`<div>`) never reaches here.
 */
function collectUsage(
  source: ts.SourceFile,
  node: ts.Node,
  site: JsxSite,
): PendingUsage | undefined {
  if (!isComponentTagName(site.tagName)) return undefined
  const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source))
  return { tagName: site.tagName, count: site.count, line: line + 1, col: character + 1 }
}

// ─── Combined single-pass analysis ─────────────────────────────────────────────

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
    constraints.filter((c) => c.hasAriaRules && isDefined(c.defaultTag)).map((c) => [c.name, c]),
  )
  const diagnostics: Diagnostic[] = []
  const usages: PendingUsage[] = []

  walkEach(source, (node) => {
    const site = getJsxSite(node)
    if (!site) return

    const cardinality = diagnoseCardinality(source, node, site, byName.get(site.tagName), severity)
    if (cardinality) diagnostics.push(cardinality)

    diagnostics.push(
      ...diagnoseAriaOverride(source, node, site, byNameAria.get(site.tagName), severity),
    )

    const usage = collectUsage(source, node, site)
    if (usage) usages.push(usage)
  })

  return { diagnostics, usages }
}

/**
 * Given a SourceFile and the set of component constraints collected from the
 * same file, walks all JSX usages and emits a Diagnostic for each site where
 * the child count range is certainly outside the [totalMin, totalMax] bounds.
 *
 * Standalone entry point (own AST walk) for callers that only need this one check — see
 * `analyze.ts`'s single-file `analyze()`. `analyzeJsxSites` above calls the same
 * `diagnoseCardinality` helper during its own combined walk; this isn't a second,
 * independently-drifting implementation of the check itself.
 */
export function diagnoseUsages(
  source: ts.SourceFile,
  constraints: ComponentConstraint[],
  severity: Severity,
): Diagnostic[] {
  if (constraints.length === 0) return []

  const byName = new Map(constraints.filter((c) => c.rules.length > 0).map((c) => [c.name, c]))
  const diagnostics: Diagnostic[] = []

  walkEach(source, (node) => {
    const site = getJsxSite(node)
    if (!site) return
    const diagnostic = diagnoseCardinality(source, node, site, byName.get(site.tagName), severity)
    if (diagnostic) diagnostics.push(diagnostic)
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
 *
 * Standalone entry point (own AST walk), kept as a directly-importable building block for
 * in-tree extension — see the module-internal-surface note in `index.ts`. Not currently called
 * from the plugin's own hot path (`analyzeJsxSites` covers that); shares `diagnoseAriaOverride`
 * with it regardless, so there's one implementation of the check either way.
 */
export function diagnoseAriaTagOverrides(
  source: ts.SourceFile,
  constraints: ComponentConstraint[],
  severity: Severity,
): Diagnostic[] {
  const byName = new Map(
    constraints.filter((c) => c.hasAriaRules && isDefined(c.defaultTag)).map((c) => [c.name, c]),
  )
  if (byName.size === 0) return []

  const diagnostics: Diagnostic[] = []

  walkEach(source, (node) => {
    const site = getJsxSite(node)
    if (!site) return
    diagnostics.push(
      ...diagnoseAriaOverride(source, node, site, byName.get(site.tagName), severity),
    )
  })

  return diagnostics
}

/**
 * Walks a source file and collects every uppercase-tag JSX usage as a
 * PendingUsage. Used by the plugin to build the cross-file validation queue:
 * usages whose tag name is not locally defined are deferred until `buildEnd`
 * when the full constraint registry is available.
 *
 * Standalone entry point (own AST walk), kept as a directly-importable building block for
 * in-tree extension — see the module-internal-surface note in `index.ts`. Not currently called
 * from the plugin's own hot path (`analyzeJsxSites` covers that); shares `collectUsage` with it
 * regardless, so there's one implementation of the check either way.
 */
export function collectJsxUsages(source: ts.SourceFile): PendingUsage[] {
  const usages: PendingUsage[] = []

  walkEach(source, (node) => {
    const site = getJsxSite(node)
    if (!site) return
    const usage = collectUsage(source, node, site)
    if (usage) usages.push(usage)
  })

  return usages
}
