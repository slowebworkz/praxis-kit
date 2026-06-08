/**
 * Compile-time design token collection.
 *
 * Walks factory call ASTs and extracts every statically-declared class string
 * used in `styling.base`, `styling.variants`, `styling.compounds`, and
 * `styling.tags`. Collects them into a per-component manifest and writes a
 * JSON file on `writeBundle`.
 *
 * The primary use case is Tailwind's `safelist` — point the emitted file at
 * Tailwind's content so none of the variant classes are purged:
 *
 *   // tailwind.config.js
 *   export default { content: ['./src/**', './praxis-tokens.json'] }
 *
 * The JSON schema is intentionally stable and human-readable:
 *
 *   {
 *     "components": {
 *       "Button": {
 *         "base": "btn",
 *         "variantClasses": ["btn-sm", "btn-md", "btn-lg"],
 *         "compoundClasses": ["btn-compact"],
 *         "tagClasses": ["link-style"]
 *       }
 *     },
 *     "allClasses": ["btn", "btn-sm", ...]
 *   }
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import ts from 'typescript'
import { asArray, asObject, firstObjectArg, getProperty, isFactoryCall, parseSource } from './ast'
import { ALL_EXTS, DEFAULT_CALLEE_NAMES } from './constants'
import type { PluginOptions } from './types'

// ─── Internal types ───────────────────────────────────────────────────────────

export type ComponentTokens = {
  base: string[]
  variantClasses: string[]
  compoundClasses: string[]
  tagClasses: string[]
}

export type DesignTokenManifest = {
  components: Record<string, ComponentTokens>
  allClasses: string[]
}

// ─── AST extraction helpers ───────────────────────────────────────────────────

function collectStringValues(node: ts.Node | undefined, out: string[]): void {
  if (!node) return
  if (ts.isStringLiteral(node)) {
    if (node.text.trim()) out.push(node.text)
    return
  }
  if (ts.isArrayLiteralExpression(node)) {
    for (const elem of node.elements) collectStringValues(elem, out)
  }
}

function extractStylingTokens(stylingObj: ts.ObjectLiteralExpression): ComponentTokens {
  const base: string[] = []
  const variantClasses: string[] = []
  const compoundClasses: string[] = []
  const tagClasses: string[] = []

  // base class
  collectStringValues(getProperty(stylingObj, 'base'), base)

  // variant class values
  const variantsObj = asObject(getProperty(stylingObj, 'variants'))
  if (variantsObj) {
    for (const dimProp of variantsObj.properties) {
      if (!ts.isPropertyAssignment(dimProp)) continue
      const valuesObj = asObject(dimProp.initializer)
      if (!valuesObj) continue
      for (const vp of valuesObj.properties) {
        if (!ts.isPropertyAssignment(vp)) continue
        collectStringValues(vp.initializer, variantClasses)
      }
    }
  }

  // compound class values
  const compoundsArr = asArray(getProperty(stylingObj, 'compounds'))
  if (compoundsArr) {
    for (const elem of compoundsArr.elements) {
      const obj = asObject(elem)
      if (!obj) continue
      collectStringValues(getProperty(obj, 'class'), compoundClasses)
    }
  }

  // tag-map class values
  const tagsObj = asObject(getProperty(stylingObj, 'tags'))
  if (tagsObj) {
    for (const tp of tagsObj.properties) {
      if (!ts.isPropertyAssignment(tp)) continue
      collectStringValues(tp.initializer, tagClasses)
    }
  }

  return { base, variantClasses, compoundClasses, tagClasses }
}

// ─── Per-file collection ──────────────────────────────────────────────────────

/**
 * Collects design tokens from all factory calls in a single source file.
 * Each entry in the returned map is keyed by the component variable name.
 *
 * Only `const X = factory(...)` declarations are handled; exported or
 * destructured patterns fall through (same scope as `collectConstraints`).
 */
export function collectFileTokens(
  source: ts.SourceFile,
  calleeNames: ReadonlySet<string>,
): Map<string, ComponentTokens> {
  const result = new Map<string, ComponentTokens>()

  ts.forEachChild(source, (stmt) => {
    if (!ts.isVariableStatement(stmt)) return
    for (const decl of stmt.declarationList.declarations) {
      if (!decl.initializer || !ts.isCallExpression(decl.initializer)) continue
      if (!isFactoryCall(decl.initializer, calleeNames)) continue
      const arg = firstObjectArg(decl.initializer)
      if (!arg) continue
      const stylingNode = getProperty(arg, 'styling')
      const stylingObj = asObject(stylingNode)
      if (!stylingObj) continue
      const name = ts.isIdentifier(decl.name) ? decl.name.text : undefined
      if (!name) continue
      result.set(name, extractStylingTokens(stylingObj))
    }
  })

  return result
}

// ─── Manifest builder ─────────────────────────────────────────────────────────

function mergeTokens(
  existing: ComponentTokens | undefined,
  incoming: ComponentTokens,
): ComponentTokens {
  if (!existing) return incoming
  return {
    base: [...new Set([...existing.base, ...incoming.base])],
    variantClasses: [...new Set([...existing.variantClasses, ...incoming.variantClasses])],
    compoundClasses: [...new Set([...existing.compoundClasses, ...incoming.compoundClasses])],
    tagClasses: [...new Set([...existing.tagClasses, ...incoming.tagClasses])],
  }
}

export function buildManifest(allTokens: Map<string, ComponentTokens>): DesignTokenManifest {
  const components: Record<string, ComponentTokens> = {}
  const seen = new Set<string>()

  for (const [name, tokens] of allTokens) {
    components[name] = tokens
    for (const cls of [
      ...tokens.base,
      ...tokens.variantClasses,
      ...tokens.compoundClasses,
      ...tokens.tagClasses,
    ]) {
      for (const part of cls.split(/\s+/)) {
        if (part) seen.add(part)
      }
    }
  }

  return {
    components,
    allClasses: [...seen].sort(),
  }
}

// ─── Vite plugin ──────────────────────────────────────────────────────────────

export type DesignTokensOptions = {
  /**
   * Path where the manifest JSON is written, relative to the Vite project root.
   * @default 'praxis-tokens.json'
   */
  outFile?: string
} & Pick<PluginOptions, 'calleeNames'>

/**
 * Vite plugin that collects every statically-declared class string from
 * `createContractComponent` factory calls and writes a design token manifest
 * to a JSON file on each build.
 *
 * The manifest contains per-component class lists and a flat `allClasses`
 * union that can be used as a Tailwind content source to prevent purging of
 * variant classes.
 *
 * @example
 * // vite.config.ts
 * import { designTokensPlugin } from '@praxis-kit/vite-plugin'
 * export default { plugins: [designTokensPlugin({ outFile: 'praxis-tokens.json' })] }
 *
 * @example
 * // tailwind.config.js
 * export default { content: ['./src/**', './praxis-tokens.json'] }
 */
export function designTokensPlugin(options?: DesignTokensOptions): Plugin {
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES)
  const outFile = options?.outFile ?? 'praxis-tokens.json'
  const accumulated = new Map<string, ComponentTokens>()

  return {
    name: 'praxis-kit:design-tokens',

    transform(code, id) {
      const ext = id.split('.').pop() ?? ''
      if (!ALL_EXTS.has(ext)) return null
      const source = parseSource(id, code)
      for (const [name, tokens] of collectFileTokens(source, calleeNames)) {
        accumulated.set(name, mergeTokens(accumulated.get(name), tokens))
      }
      return null
    },

    writeBundle() {
      if (accumulated.size === 0) return
      const manifest = buildManifest(accumulated)
      const root = (this as unknown as { config?: { root?: string } }).config?.root ?? process.cwd()
      writeFileSync(resolve(root, outFile), JSON.stringify(manifest, null, 2))
    },
  }
}
