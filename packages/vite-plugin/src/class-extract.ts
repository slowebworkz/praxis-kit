/**
 * Compile-time variant class precomputation.
 *
 * Extracts `styling.variants`, `styling.defaults`, and `styling.compounds` from
 * factory call ASTs, enumerates all statically-known prop combinations, computes
 * the variant class string for each, and injects the resulting map as
 * `styling.precomputedClasses` directly into the source.
 *
 * At runtime, `VariantClassResolver` checks `precomputedClasses` before
 * calling CVA — a plain object lookup replaces a CVA invocation + LRU cache
 * write for every covered combination.
 *
 * **Skipped when any of the following are true:**
 * - `styling.variants` is absent or contains non-literal values
 * - `styling.compounds` contains non-literal conditions or class values
 * - The total number of combinations exceeds MAX_COMBINATIONS
 * - The styling object already has a `precomputedClasses` property
 */
import ts from 'typescript'
import { asArray, asObject, firstObjectArg, getProperty, isFactoryCall, walk } from './ast'

// Cap to keep injected code size reasonable.
const MAX_COMBINATIONS = 512

// ─── Internal types ───────────────────────────────────────────────────────────

type VariantValues = Record<string, string | string[]>
type VariantMap = Record<string, VariantValues>
type DefaultMap = Record<string, string>

type CompoundEntry = {
  conditions: Record<string, string | string[]>
  cls: string | string[]
}

type StylingConfig = {
  variantMap: VariantMap
  defaults: DefaultMap
  compounds: CompoundEntry[]
}

// ─── AST extraction ───────────────────────────────────────────────────────────

function asString(node: ts.Node | undefined): string | undefined {
  return node && ts.isStringLiteral(node) ? node.text : undefined
}

function asStringOrStringArray(node: ts.Node | undefined): string | string[] | undefined {
  if (!node) return undefined
  if (ts.isStringLiteral(node)) return node.text
  if (ts.isArrayLiteralExpression(node)) {
    const items: string[] = []
    for (const elem of node.elements) {
      if (!ts.isStringLiteral(elem)) return undefined
      items.push(elem.text)
    }
    return items
  }
  return undefined
}

function propKey(prop: ts.ObjectLiteralElementLike): string | undefined {
  if (!ts.isPropertyAssignment(prop)) return undefined
  const n = prop.name
  return ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : undefined
}

function extractVariantMap(stylingObj: ts.ObjectLiteralExpression): VariantMap | null {
  const variantsObj = asObject(getProperty(stylingObj, 'variants'))
  if (!variantsObj) return null

  const result: VariantMap = {}
  for (const prop of variantsObj.properties) {
    const key = propKey(prop)
    if (!key || !ts.isPropertyAssignment(prop)) return null
    const valuesObj = asObject(prop.initializer)
    if (!valuesObj) return null
    const values: VariantValues = {}
    for (const vp of valuesObj.properties) {
      const vk = propKey(vp)
      if (!vk || !ts.isPropertyAssignment(vp)) return null
      const v = asStringOrStringArray(vp.initializer)
      if (v === undefined) return null
      values[vk] = v
    }
    result[key] = values
  }
  return result
}

function extractDefaults(stylingObj: ts.ObjectLiteralExpression): DefaultMap {
  const defaultsObj = asObject(getProperty(stylingObj, 'defaults'))
  if (!defaultsObj) return {}
  const result: DefaultMap = {}
  for (const prop of defaultsObj.properties) {
    const key = propKey(prop)
    if (!key || !ts.isPropertyAssignment(prop)) return {}
    const v = asString(prop.initializer)
    if (v === undefined) return {}
    result[key] = v
  }
  return result
}

function extractCompounds(stylingObj: ts.ObjectLiteralExpression): CompoundEntry[] | null {
  const compoundsArr = asArray(getProperty(stylingObj, 'compounds'))
  if (!compoundsArr) return []

  const result: CompoundEntry[] = []
  for (const elem of compoundsArr.elements) {
    const obj = asObject(elem)
    if (!obj) return null
    const cls = asStringOrStringArray(getProperty(obj, 'class'))
    if (cls === undefined) return null
    const conditions: Record<string, string | string[]> = {}
    for (const cp of obj.properties) {
      const key = propKey(cp)
      if (!key || !ts.isPropertyAssignment(cp)) return null
      if (key === 'class') continue
      const v = asStringOrStringArray(cp.initializer)
      if (v === undefined) return null
      conditions[key] = v
    }
    result.push({ conditions, cls })
  }
  return result
}

// ─── Combination enumeration ──────────────────────────────────────────────────

/**
 * Enumerates every subset of variant props (each dimension either absent or set
 * to one of its declared values). Returns null if total would exceed MAX_COMBINATIONS.
 */
export function enumerateCombinations(
  variantMap: VariantMap,
): Array<Record<string, string>> | null {
  const keys = Object.keys(variantMap)
  if (keys.length === 0) return [{}]

  let total = 1
  for (const key of keys) {
    total *= Object.keys(variantMap[key]!).length + 1
    if (total > MAX_COMBINATIONS) return null
  }

  function rec(remaining: string[]): Array<Record<string, string>> {
    if (remaining.length === 0) return [{}]
    const first = remaining[0] as string
    const rest = remaining.slice(1)
    const restCombos = rec(rest)
    const valueKeys = Object.keys(variantMap[first]!)
    const out: Array<Record<string, string>> = []
    for (const combo of restCombos) {
      out.push(combo)
      for (const v of valueKeys) {
        out.push({ [first]: v, ...combo })
      }
    }
    return out
  }

  return rec(keys)
}

// ─── Cache key ────────────────────────────────────────────────────────────────

/**
 * Builds the VariantClassResolver cache key for a given explicit prop combination.
 * Absent variant dimensions are excluded from the key (defaults apply in compute).
 */
export function buildCacheKey(props: Record<string, string>): string {
  const parts = Object.keys(props)
    .sort()
    .map((k) => `${k}:s:${props[k]}`)
  return `__none__:${parts.join('|')}`
}

// ─── Class computation ────────────────────────────────────────────────────────

function computeClasses(config: StylingConfig, props: Record<string, string>): string {
  const { variantMap, defaults, compounds } = config
  const effective = { ...defaults, ...props }
  const classes: string[] = []

  for (const [key, values] of Object.entries(variantMap)) {
    const v = effective[key]
    if (v === undefined) continue
    const cls = values[v]
    if (cls === undefined) continue
    if (Array.isArray(cls)) classes.push(...cls)
    else classes.push(cls)
  }

  for (const { conditions, cls } of compounds) {
    let ok = true
    for (const [key, cond] of Object.entries(conditions)) {
      const v = effective[key]
      if (Array.isArray(cond)) {
        if (v === undefined || !cond.includes(v)) {
          ok = false
          break
        }
      } else {
        if (v !== cond) {
          ok = false
          break
        }
      }
    }
    if (ok) {
      if (Array.isArray(cls)) classes.push(...cls)
      else classes.push(cls)
    }
  }

  return classes.filter(Boolean).join(' ')
}

// ─── Map builder ──────────────────────────────────────────────────────────────

/**
 * Builds a precomputed class map for the given styling object literal.
 *
 * Returns null when static extraction is not possible (non-literal values,
 * no variants, or combination count exceeds MAX_COMBINATIONS).
 */
export function buildPrecomputedClasses(
  stylingObj: ts.ObjectLiteralExpression,
): Record<string, string> | null {
  if (getProperty(stylingObj, 'precomputedClasses') !== undefined) return null

  const variantMap = extractVariantMap(stylingObj)
  if (!variantMap || Object.keys(variantMap).length === 0) return null

  const defaults = extractDefaults(stylingObj)
  const compounds = extractCompounds(stylingObj)
  if (!compounds) return null

  const combos = enumerateCombinations(variantMap)
  if (!combos) return null

  const config: StylingConfig = { variantMap, defaults, compounds }
  const map: Record<string, string> = {}
  for (const combo of combos) {
    map[buildCacheKey(combo)] = computeClasses(config, combo)
  }
  return map
}

// ─── AST transformer ─────────────────────────────────────────────────────────

function createClassExtractTransformer(
  factory: ts.NodeFactory,
  calleeNames: ReadonlySet<string>,
  onInjected: () => void,
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    function visit(node: ts.Node): ts.Node {
      if (!ts.isCallExpression(node)) return ts.visitEachChild(node, visit, context)
      if (!isFactoryCall(node, calleeNames)) return ts.visitEachChild(node, visit, context)

      const arg = firstObjectArg(node)
      if (!arg) return node

      const stylingNode = getProperty(arg, 'styling')
      const stylingObj = asObject(stylingNode)
      if (!stylingObj) return ts.visitEachChild(node, visit, context)

      const map = buildPrecomputedClasses(stylingObj)
      if (!map) return ts.visitEachChild(node, visit, context)

      onInjected()

      // Build `precomputedClasses: { 'key': 'value', ... }` property.
      const mapProps = Object.entries(map).map(([k, v]) =>
        factory.createPropertyAssignment(
          factory.createStringLiteral(k),
          factory.createStringLiteral(v),
        ),
      )
      const mapLiteral = factory.createObjectLiteralExpression(mapProps, true)
      const precomputedProp = factory.createPropertyAssignment(
        factory.createIdentifier('precomputedClasses'),
        mapLiteral,
      )

      const newStylingObj = factory.createObjectLiteralExpression(
        [...stylingObj.properties, precomputedProp],
        true,
      )
      const newArgProps = arg.properties.map((p) => {
        if (
          ts.isPropertyAssignment(p) &&
          (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
          p.name.text === 'styling'
        ) {
          return factory.createPropertyAssignment(p.name, newStylingObj)
        }
        return p
      })
      const newArg = factory.createObjectLiteralExpression(newArgProps, true)
      return factory.createCallExpression(node.expression, node.typeArguments, [
        newArg,
        ...node.arguments.slice(1),
      ])
    }

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context)
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Injects precomputed variant class maps into all factory calls in the given
 * source file that have fully-static `styling.variants` configurations.
 *
 * Returns null when no factory calls with injectable variants are found.
 */
export function injectPrecomputedClasses(
  source: ts.SourceFile,
  calleeNames: ReadonlySet<string>,
): string | null {
  let hasVariants = false
  walk(source, (n) => {
    if (hasVariants) return
    if (
      ts.isPropertyAssignment(n) &&
      (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) &&
      n.name.text === 'variants'
    )
      hasVariants = true
  })
  if (!hasVariants) return null

  let didInject = false
  const result = ts.transform(
    source,
    [
      createClassExtractTransformer(ts.factory, calleeNames, () => {
        didInject = true
      }),
    ],
    { target: ts.ScriptTarget.Latest },
  )

  if (!didInject) {
    result.dispose()
    return null
  }

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false })
  const output = printer.printFile(result.transformed[0]!)
  result.dispose()
  return output
}
