/**
 * Compile-time asChild → render-prop transform.
 *
 * Rewrites JSX usage sites of the form:
 *   <Component asChild ...props>
 *     <childTag ...childProps>children</childTag>
 *   </Component>
 *
 * to the render-prop form:
 *   <Component render={(_p) => <childTag ...childProps {..._p} />} ...props />
 *
 * The render-prop form eliminates the Slot/cloneElement/mergeProps path at
 * runtime — resolved props are passed directly to the render callback with no
 * element cloning.
 *
 * **Safety conditions** — the transform is skipped if any of these are true:
 *   1. The child has a `className`, `style`, or event handler (`on*`) prop.
 *      These need the merge semantics that Slot provides; a simple spread would
 *      silently drop the child's handlers.
 *   2. The child is a self-closing element with no stable attributes to preserve
 *      in the render callback (degenerate case — leave as-is).
 *   3. The component name starts with a lowercase letter (HTML intrinsic — not
 *      a polymorphic component).
 *   4. There are zero or more than one meaningful child elements.
 *
 * The transform is conservative: any condition that is not statically clear
 * causes the node to be left unchanged.
 */
import ts from 'typescript'
import { walk } from './ast'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isUpperCase(s: string): boolean {
  return s.charCodeAt(0) >= 65 && s.charCodeAt(0) <= 90
}

/** Returns the attribute name string; empty string for namespaced names. */
function jsxAttrName(attr: ts.JsxAttribute): string {
  return ts.isIdentifier(attr.name) ? attr.name.text : ''
}

/** Returns true if the attribute name indicates a conflicting prop. */
function isConflictingProp(name: string): boolean {
  return name === 'className' || name === 'style' || /^on[A-Z]/.test(name)
}

/** Returns true if the opening element has an `asChild` attribute (bare or `={true}`). */
function hasAsChild(opening: ts.JsxOpeningElement): boolean {
  for (const attr of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attr)) continue
    if (jsxAttrName(attr) !== 'asChild') continue
    // bare `asChild` or `asChild={true}`
    if (attr.initializer === undefined) return true
    if (
      ts.isJsxExpression(attr.initializer) &&
      attr.initializer.expression !== undefined &&
      attr.initializer.expression.kind === ts.SyntaxKind.TrueKeyword
    )
      return true
  }
  return false
}

/** Returns the single meaningful JSX element child, or undefined if there isn't exactly one. */
function getSingleElementChild(
  node: ts.JsxElement,
): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
  const meaningful: (ts.JsxElement | ts.JsxSelfClosingElement)[] = []
  for (const child of node.children) {
    if (ts.isJsxText(child)) {
      if (child.text.trim().length > 0) return undefined // non-whitespace text — bail
      continue
    }
    if (ts.isJsxExpression(child)) return undefined // dynamic content — bail
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      meaningful.push(child)
      continue
    }
    return undefined // fragment or other — bail
  }
  return meaningful.length === 1 ? meaningful[0] : undefined
}

/** Returns true if the child element has any conflicting props. */
function childHasConflictingProps(child: ts.JsxElement | ts.JsxSelfClosingElement): boolean {
  const attrs = ts.isJsxElement(child)
    ? child.openingElement.attributes.properties
    : child.attributes.properties

  for (const attr of attrs) {
    if (ts.isJsxAttribute(attr) && isConflictingProp(jsxAttrName(attr))) return true
  }
  return false
}

/** Returns the tag name string if the opening element has a simple identifier tag. */
function getTagName(child: ts.JsxElement | ts.JsxSelfClosingElement): string | undefined {
  const tag = ts.isJsxElement(child) ? child.openingElement.tagName : child.tagName
  return ts.isIdentifier(tag) ? tag.text : undefined
}

/**
 * Builds the attribute list for the transformed parent, omitting `asChild`
 * and adding `render={(_p) => <childTag ...childAttrs {..._p} />}`.
 */
function buildTransformedAttributes(
  factory: ts.NodeFactory,
  original: ts.JsxOpeningElement,
  child: ts.JsxElement | ts.JsxSelfClosingElement,
  tagName: string,
): ts.JsxAttributes {
  // Parent attrs without asChild
  const parentAttrs = original.attributes.properties.filter(
    (attr) => !(ts.isJsxAttribute(attr) && jsxAttrName(attr) === 'asChild'),
  )

  // Child's own attributes (excluding ref — the render callback receives ref from the slot)
  const childOpeningAttrs = (
    ts.isJsxElement(child)
      ? child.openingElement.attributes.properties
      : child.attributes.properties
  ).filter((attr) => !(ts.isJsxAttribute(attr) && jsxAttrName(attr) === 'ref'))

  // Child's children content (for non-self-closing child elements)
  const childContent = ts.isJsxElement(child) ? child.children : undefined

  // Spread: `{..._p}`
  const spreadProp = factory.createJsxSpreadAttribute(factory.createIdentifier('_p'))

  // Reconstruct the child element with child's own attrs + spread
  const childAttrsWithSpread = factory.createJsxAttributes([...childOpeningAttrs, spreadProp])

  const childElement = ts.isJsxElement(child)
    ? factory.createJsxElement(
        factory.createJsxOpeningElement(
          factory.createIdentifier(tagName),
          undefined,
          childAttrsWithSpread,
        ),
        childContent ?? [],
        factory.createJsxClosingElement(factory.createIdentifier(tagName)),
      )
    : factory.createJsxSelfClosingElement(
        factory.createIdentifier(tagName),
        undefined,
        childAttrsWithSpread,
      )

  // Arrow function: (_p) => childElement
  const renderArrow = factory.createArrowFunction(
    undefined,
    undefined,
    [factory.createParameterDeclaration(undefined, undefined, '_p')],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    factory.createParenthesizedExpression(childElement),
  )

  const renderAttr = factory.createJsxAttribute(
    factory.createIdentifier('render'),
    factory.createJsxExpression(undefined, renderArrow),
  )

  return factory.createJsxAttributes([renderAttr, ...parentAttrs])
}

// ─── Transformer ─────────────────────────────────────────────────────────────

/**
 * Returns a TypeScript transformer that rewrites safe `asChild` JSX patterns
 * to the render-prop form in a single source file.
 */
function createAsChildTransformer(factory: ts.NodeFactory): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    function visit(node: ts.Node): ts.Node {
      // Only transform JsxElement nodes, not self-closing (asChild requires children)
      if (!ts.isJsxElement(node)) return ts.visitEachChild(node, visit, context)

      const opening = node.openingElement
      const tagName = ts.isIdentifier(opening.tagName) ? opening.tagName.text : undefined

      if (!tagName || !isUpperCase(tagName)) {
        return ts.visitEachChild(node, visit, context)
      }

      if (!hasAsChild(opening)) return ts.visitEachChild(node, visit, context)

      const child = getSingleElementChild(node)
      if (!child) return ts.visitEachChild(node, visit, context)

      if (childHasConflictingProps(child)) return ts.visitEachChild(node, visit, context)

      const childTag = getTagName(child)
      if (!childTag) return ts.visitEachChild(node, visit, context)

      // All conditions met — emit render-prop form as a self-closing element.
      const newAttrs = buildTransformedAttributes(factory, opening, child, childTag)

      return factory.createJsxSelfClosingElement(opening.tagName, opening.typeArguments, newAttrs)
    }

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context)
  }
}

// ─── Public entry point ──────────────────────────────────────────────────────

/**
 * Applies the asChild → render-prop transform to the given TypeScript source
 * file and returns the printed output.
 *
 * Returns null if no `asChild` attribute is found in the source (fast path —
 * avoids parsing overhead for files that don't use the pattern).
 */
export function transformAsChild(source: ts.SourceFile): string | null {
  // Fast path: bail immediately if no asChild attribute is present
  let hasAny = false
  walk(source, (n) => {
    if (hasAny) return
    if (ts.isJsxAttribute(n) && jsxAttrName(n) === 'asChild') hasAny = true
  })
  if (!hasAny) return null

  const result = ts.transform(source, [createAsChildTransformer(ts.factory)], {
    jsx: ts.JsxEmit.Preserve,
    target: ts.ScriptTarget.Latest,
  })

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false })
  const output = printer.printFile(result.transformed[0]!)
  result.dispose()
  return output
}
