/**
 * Compile-time static composition transform.
 *
 * For factory calls that have `precomputedClasses` injected (by classExtractPlugin),
 * replaces static JSX usage sites with direct element creation — bypassing the
 * runtime render pipeline entirely.
 *
 * Example:
 *   // Source (same file defines Button and uses it)
 *   const Button = createContractComponent({ tag: 'button', styling: { precomputedClasses: {...} } })
 *   <Button size="lg">Click</Button>
 *
 *   // Output
 *   const Button = createContractComponent({ ... }) // unchanged — still exported
 *   <button className="btn btn-lg">Click</button>  // inlined!
 *
 * **Eligibility conditions** — a usage site is inlined only when:
 *   1. The component is defined in the same file or imported from a file already
 *      transformed by this plugin, with `precomputedClasses` injected
 *   2. No `as`, `asChild`, `render`, or spread attributes at the usage site
 *   3. All variant props are static string literals
 *   4. `className` is absent or a static string literal
 *   5. The factory config has no top-level `defaults` and no `enforcement`
 *      (either would require runtime prop normalization that inlining skips)
 *
 * The factory call itself is intentionally left in the output so the component
 * remains exportable for cross-file consumption that falls back to the runtime
 * path. Dead-code elimination at the bundler level can remove it when no
 * runtime path remains.
 *
 * **Cross-file known limitations:**
 * - Barrel re-exports are not resolved (import from index.ts re-exporting ./Button)
 * - Aliased imports are not matched (`export { Btn as Button }` won't be found)
 * - Dev-mode ordering: definition file may not yet be transformed when consumer runs
 * All three degrade gracefully to the runtime path — no error, no broken output.
 */
import type { StringMap } from '@praxis-kit/primitive'
import { isDefined, isUndefined, iterate } from '@praxis-kit/primitive'
import ts from 'typescript'
import { asObject, firstObjectArg, getProperty, isFactoryCall, walkEach } from './ast'
import { buildCacheKey } from './class-extract'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Structural props stripped from a usage site's output attributes — every variant key plus the
 *  four fixed names the transform itself consumes rather than forwards. Precomputed once per
 *  component in {@link extractStaticComponents}, since it depends only on `variantKeys` and is
 *  otherwise identical for every usage site of that component. */
export type StaticComponent = {
  readonly defaultTag: string
  readonly variantKeys: ReadonlySet<string>
  readonly precomputedClasses: Readonly<StringMap<string>>
  readonly strippedProps: ReadonlySet<string>
}

// ─── Phase 1: collect factory call metadata ───────────────────────────────────

/** Returns the text of a string literal node, or undefined. */
function asStringLiteral(node: ts.Node | undefined): string | undefined {
  return isDefined(node) && ts.isStringLiteral(node) ? node.text : undefined
}

/**
 * Walks the source file and extracts metadata for each same-file factory call
 * that is eligible for static composition.
 */
export function extractStaticComponents(
  source: ts.SourceFile,
  calleeNames: ReadonlySet<string>,
): Map<string, StaticComponent> {
  const result = new Map<string, StaticComponent>()

  walkEach(source, (node) => {
    if (!ts.isVariableDeclaration(node)) return
    if (!ts.isIdentifier(node.name)) return
    const varName = node.name.text
    const init = node.initializer
    if (!init) return

    // Accept: `const X = factory({...})` and `const X = factory({...}) as T`
    let call: ts.CallExpression | undefined
    if (ts.isCallExpression(init) && isFactoryCall(init, calleeNames)) {
      call = init
    } else if (
      ts.isAsExpression(init) &&
      ts.isCallExpression(init.expression) &&
      isFactoryCall(init.expression, calleeNames)
    ) {
      call = init.expression
    }
    if (!call) return

    const arg = firstObjectArg(call)
    if (!arg) return

    // Require a static string `tag`.
    const defaultTag = asStringLiteral(getProperty(arg, 'tag'))
    if (!defaultTag) return

    // Require `styling.precomputedClasses` (injected by classExtractPlugin).
    const stylingObj = asObject(getProperty(arg, 'styling'))
    if (!stylingObj) return
    const precomputedNode = asObject(getProperty(stylingObj, 'precomputedClasses'))
    if (!precomputedNode) return

    // Extract precomputedClasses as a plain Record. A straightforward loop reads more directly
    // here than `iterate.find` would — this isn't a search for one matching element, it's
    // "extract every entry, bailing the whole component if any one is malformed."
    const precomputedClasses: StringMap<string> = {}
    let sawMalformedEntry = false
    for (const prop of precomputedNode.properties) {
      if (!ts.isPropertyAssignment(prop)) {
        sawMalformedEntry = true
        break
      }
      const { initializer, name } = prop
      const key = ts.isStringLiteral(name) ? name.text : undefined
      const val = asStringLiteral(initializer)
      if (isUndefined(key) || isUndefined(val)) {
        sawMalformedEntry = true
        break
      }
      precomputedClasses[key] = val
    }
    if (sawMalformedEntry) return

    // Bail if the component has top-level `defaults` or `enforcement`:
    // those involve prop merging or ARIA normalization that inlining would skip.
    if (isDefined(getProperty(arg, 'defaults'))) return
    if (isDefined(getProperty(arg, 'enforcement'))) return

    // Extract variant dimension keys (top-level keys of `styling.variants`).
    const variantKeys = new Set<string>()
    const variantsObj = asObject(getProperty(stylingObj, 'variants'))
    if (variantsObj) {
      iterate.forEach(variantsObj.properties, (prop) => {
        if (
          ts.isPropertyAssignment(prop) &&
          (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))
        ) {
          variantKeys.add(prop.name.text)
        }
      })
    }

    const strippedProps = new Set([...variantKeys, 'as', 'asChild', 'render', 'className'])
    result.set(varName, { defaultTag, variantKeys, precomputedClasses, strippedProps })
  })

  return result
}

// ─── Phase 2: per-usage-site analysis ────────────────────────────────────────

/** The transform's static-value subset for a JSX attribute: absent, a compile-time-known string,
 *  or dynamic (anything the transform can't reason about at compile time — including a bare
 *  shorthand attribute; see {@link readStaticAttribute}'s own note on why that's `'dynamic'`, not
 *  a fourth "boolean" case). */
type StaticAttributeValue =
  { kind: 'absent' } | { kind: 'static'; value: string } | { kind: 'dynamic' }

/**
 * Reads the value of a named JSX attribute from the attribute list: absent, a static string, or
 * dynamic.
 *
 * A bare shorthand attribute (`<Button size />`) is `'dynamic'`, not `'static'` with an empty
 * string: JSX gives a bare attribute the runtime value `true` (boolean), never `''`. Every
 * consumer of this function that reasons about a variant/tag/className value only ever expects a
 * *string* — `true` can never satisfy a `size:s:sm`-style precomputed-class cache key or a real
 * variant's string-keyed value map, so treating it as truly unknown (rather than silently
 * collapsing it to `''`) is both the more accurate representation of what the runtime actually
 * sees and the conservative choice: it bails to the runtime path instead of risking a wrong
 * inlined class string for a `variants: { size: { '': ... } }`-shaped config, where the old `''`
 * representation could have coincidentally matched a real (if unusual) empty-string variant
 * value.
 */
function readStaticAttribute(
  attrs: ts.NodeArray<ts.JsxAttributeLike>,
  name: string,
): StaticAttributeValue {
  for (const attr of attrs) {
    if (!ts.isJsxAttribute(attr)) continue
    if (!(ts.isIdentifier(attr.name) && attr.name.text === name)) continue
    const init = attr.initializer
    if (!init) return { kind: 'dynamic' } // bare attribute — runtime value is `true`, not `''`
    if (ts.isStringLiteral(init)) return { kind: 'static', value: init.text }
    if (ts.isJsxExpression(init) && init.expression !== undefined) {
      if (ts.isStringLiteral(init.expression))
        return { kind: 'static', value: init.expression.text }
      return { kind: 'dynamic' }
    }
    return { kind: 'dynamic' }
  }
  return { kind: 'absent' }
}

// ─── Phase 3: AST transformer ─────────────────────────────────────────────────

/** Returns a TS transformer that replaces eligible JSX usage sites with direct element creation. */
function createStaticCompositionTransformer(
  factory: ts.NodeFactory,
  components: Map<string, StaticComponent>,
  onInlined: () => void,
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    function visit(node: ts.Node): ts.Node {
      // Handle both self-closing and open-close JSX elements.
      const isSelfClose = ts.isJsxSelfClosingElement(node)
      const isOpen = ts.isJsxElement(node)
      if (!isSelfClose && !isOpen) return ts.visitEachChild(node, visit, context)

      const tagNode = isOpen
        ? (node as ts.JsxElement).openingElement.tagName
        : (node as ts.JsxSelfClosingElement).tagName
      if (!ts.isIdentifier(tagNode)) return ts.visitEachChild(node, visit, context)

      const info = components.get(tagNode.text)
      if (!info) return ts.visitEachChild(node, visit, context)

      const attrList = isOpen
        ? (node as ts.JsxElement).openingElement.attributes.properties
        : (node as ts.JsxSelfClosingElement).attributes.properties

      // Bail if any spread attributes are present.
      if (attrList.some(ts.isJsxSpreadAttribute)) return ts.visitEachChild(node, visit, context)

      // Bail if asChild or render prop is present.
      if (readStaticAttribute(attrList, 'asChild').kind !== 'absent')
        return ts.visitEachChild(node, visit, context)
      if (readStaticAttribute(attrList, 'render').kind !== 'absent')
        return ts.visitEachChild(node, visit, context)

      // Resolve output tag: static `as` overrides defaultTag; dynamic `as` bails.
      const asVal = readStaticAttribute(attrList, 'as')
      if (asVal.kind === 'dynamic') return ts.visitEachChild(node, visit, context)
      const outputTag = asVal.kind === 'static' ? asVal.value : info.defaultTag

      // Collect variant prop values; bail on any dynamic variant prop.
      const variantProps: StringMap<string> = {}
      for (const propName of info.variantKeys) {
        const val = readStaticAttribute(attrList, propName)
        if (val.kind === 'absent') continue
        if (val.kind === 'static') {
          variantProps[propName] = val.value
          continue
        }
        return ts.visitEachChild(node, visit, context)
      }

      // Look up precomputed class for this variant combination.
      const cacheKey = buildCacheKey(variantProps)
      const baseClass = info.precomputedClasses[cacheKey]
      if (isUndefined(baseClass)) return ts.visitEachChild(node, visit, context)

      // Resolve caller className; bail on dynamic className.
      const clsVal = readStaticAttribute(attrList, 'className')
      if (clsVal.kind === 'dynamic') return ts.visitEachChild(node, visit, context)
      const finalClass =
        clsVal.kind === 'static' && clsVal.value ? `${baseClass} ${clsVal.value}` : baseClass

      // Build output attr list: className first, then all non-variant/non-structural props.
      const outputAttrs: ts.JsxAttributeLike[] = [
        factory.createJsxAttribute(
          factory.createIdentifier('className'),
          factory.createStringLiteral(finalClass),
        ),
      ]
      for (const attr of attrList) {
        if (ts.isJsxSpreadAttribute(attr)) continue
        if (!ts.isJsxAttribute(attr)) continue
        const name = ts.isIdentifier(attr.name) ? attr.name.text : ''
        if (info.strippedProps.has(name)) continue
        outputAttrs.push(attr)
      }

      const newAttrs = factory.createJsxAttributes(outputAttrs)
      const outputTagIdent = factory.createIdentifier(outputTag)

      onInlined()

      if (isSelfClose) {
        return factory.createJsxSelfClosingElement(outputTagIdent, undefined, newAttrs)
      }

      // Open-close element: recursively visit children before inlining the wrapper.
      const openNode = node as ts.JsxElement
      const visitedChildren = openNode.children.map((c) => ts.visitNode(c, visit) as ts.JsxChild)
      return factory.createJsxElement(
        factory.createJsxOpeningElement(outputTagIdent, undefined, newAttrs),
        visitedChildren,
        factory.createJsxClosingElement(outputTagIdent),
      )
    }

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context)
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Applies the static composition transform to the given source file.
 *
 * `importedComponents` contains cross-file metadata resolved by the plugin
 * registry — components defined in other files that were already transformed.
 * When empty (dev mode ordering race or barrel re-export), same-file components
 * still inline normally; cross-file sites fall through to the runtime path.
 *
 * Returns null when:
 * - No eligible factory calls or imported components are present
 * - No eligible usage sites are found after analysis
 */
export function composeStatically(
  source: ts.SourceFile,
  calleeNames: ReadonlySet<string>,
  importedComponents: ReadonlyMap<string, StaticComponent> = new Map(),
): string | null {
  const sameFile = extractStaticComponents(source, calleeNames)
  // Same-file definitions take precedence over imported ones (local shadowing).
  const components =
    importedComponents.size > 0 ? new Map([...importedComponents, ...sameFile]) : sameFile
  if (components.size === 0) return null

  // Fast path: skip transform if none of the component names appear as JSX tags.
  const componentNames = new Set(components.keys())
  let hasEligibleTag = false
  walkEach(source, (n) => {
    if (hasEligibleTag) return
    const tagNode = ts.isJsxElement(n)
      ? n.openingElement.tagName
      : ts.isJsxSelfClosingElement(n)
        ? n.tagName
        : undefined
    if (tagNode && ts.isIdentifier(tagNode) && componentNames.has(tagNode.text))
      hasEligibleTag = true
  })
  if (!hasEligibleTag) return null

  let didInline = false
  const transformResult = ts.transform(
    source,
    [
      createStaticCompositionTransformer(ts.factory, components, () => {
        didInline = true
      }),
    ],
    { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.Latest },
  )

  if (!didInline) {
    transformResult.dispose()
    return null
  }

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false })
  const output = printer.printFile(transformResult.transformed[0]!)
  transformResult.dispose()
  return output
}
