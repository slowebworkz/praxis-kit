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
 *   1. The child has a dynamic `className` expression (cannot merge safely).
 *      A string-literal `className` IS handled: the transform generates
 *      `{..._p, className: _p.className + ' childCls'}`.
 *   2. The child has a bare `style` or `on*` attribute without an initializer.
 *      Static object-literal and expression-valued `style` props are merged:
 *      `style={{..._p.style, ...childStyle}}`.  Event handlers are composed:
 *      `onClick={(_e) => { (childHandler)(_e); _p.onClick?.(_e); }}`.
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

/**
 * Extracts the static string value of the child's `className` prop.
 *
 * Returns:
 * - `{ absent: true }` when no className prop is present (safe to transform)
 * - `{ absent: false, value: string }` when className is a string literal
 * - `null` when className is present but dynamic (bail — cannot merge safely)
 */
type ClassNameResult = { absent: true } | { absent: false; value: string }

function getStaticClassName(
  child: ts.JsxElement | ts.JsxSelfClosingElement,
): ClassNameResult | null {
  const attrs = ts.isJsxElement(child)
    ? child.openingElement.attributes.properties
    : child.attributes.properties
  for (const attr of attrs) {
    if (!ts.isJsxAttribute(attr) || jsxAttrName(attr) !== 'className') continue
    const init = attr.initializer
    if (!init) return { absent: false, value: '' }
    if (ts.isStringLiteral(init)) return { absent: false, value: init.text }
    if (
      ts.isJsxExpression(init) &&
      init.expression !== undefined &&
      ts.isStringLiteral(init.expression)
    )
      return { absent: false, value: init.expression.text }
    return null
  }
  return { absent: true }
}

/**
 * Extracts the child's `style` prop expression.
 *
 * Returns:
 * - `{ absent: true }` when no style prop is present
 * - `{ absent: false, expr }` when style is a JSX expression (any inner expr)
 * - `null` when style is present but cannot be safely handled (bare attr, string literal)
 */
type StyleResult = { absent: true } | { absent: false; expr: ts.Expression }

function getStyleInfo(child: ts.JsxElement | ts.JsxSelfClosingElement): StyleResult | null {
  const attrs = ts.isJsxElement(child)
    ? child.openingElement.attributes.properties
    : child.attributes.properties
  for (const attr of attrs) {
    if (!ts.isJsxAttribute(attr) || jsxAttrName(attr) !== 'style') continue
    const init = attr.initializer
    // Bare `style` or string-literal style — not a valid style shape; bail.
    if (!init || ts.isStringLiteral(init)) return null
    if (ts.isJsxExpression(init) && init.expression !== undefined)
      return { absent: false, expr: init.expression }
    return null
  }
  return { absent: true }
}

/**
 * Collects all `on*` event handler props from the child element.
 *
 * Returns:
 * - Array of `{ name, expr }` for each handler (may be empty when none present)
 * - `null` when any handler lacks an expression initializer (bail)
 */
type HandlerEntry = { name: string; expr: ts.Expression }

function getEventHandlers(child: ts.JsxElement | ts.JsxSelfClosingElement): HandlerEntry[] | null {
  const attrs = ts.isJsxElement(child)
    ? child.openingElement.attributes.properties
    : child.attributes.properties
  const handlers: HandlerEntry[] = []
  for (const attr of attrs) {
    if (!ts.isJsxAttribute(attr)) continue
    const name = jsxAttrName(attr)
    if (!/^on[A-Z]/.test(name)) continue
    const init = attr.initializer
    if (!init) return null // bare on* without value — bail
    if (ts.isJsxExpression(init) && init.expression !== undefined) {
      handlers.push({ name, expr: init.expression })
      continue
    }
    return null // unhandleable initializer form — bail
  }
  return handlers
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

/** Returns the tag name string if the opening element has a simple identifier tag. */
function getTagName(child: ts.JsxElement | ts.JsxSelfClosingElement): string | undefined {
  const tag = ts.isJsxElement(child) ? child.openingElement.tagName : child.tagName
  return ts.isIdentifier(tag) ? tag.text : undefined
}

/**
 * Builds the attribute list for the transformed parent, omitting `asChild`
 * and adding `render={(_p) => <childTag ...childAttrs {..._p} />}`.
 *
 * Merged props are placed after the `{..._p}` spread so they override _p:
 * - Static `className` → `className={_p.className + ' childCls'}`
 * - `style` → `style={{..._p.style, ...childStyleExpr}}`
 * - `on*` handlers → `onClick={(_e) => { (childHandler)(_e); _p.onClick?.(_e); }}`
 */
function buildTransformedAttributes(
  factory: ts.NodeFactory,
  original: ts.JsxOpeningElement,
  child: ts.JsxElement | ts.JsxSelfClosingElement,
  tagName: string,
  clsResult: ClassNameResult,
  styleInfo: StyleResult,
  handlers: HandlerEntry[],
): ts.JsxAttributes {
  // Parent attrs without asChild
  const parentAttrs = original.attributes.properties.filter(
    (attr) => !(ts.isJsxAttribute(attr) && jsxAttrName(attr) === 'asChild'),
  )

  const hasStaticCls = !clsResult.absent
  const hasStyle = !styleInfo.absent
  const handlerNames = new Set(handlers.map((h) => h.name))

  // Child's own attributes — exclude ref and any props we're overriding after the spread.
  const childOpeningAttrs = (
    ts.isJsxElement(child)
      ? child.openingElement.attributes.properties
      : child.attributes.properties
  ).filter(
    (attr) =>
      !(
        ts.isJsxAttribute(attr) &&
        (jsxAttrName(attr) === 'ref' ||
          (hasStaticCls && jsxAttrName(attr) === 'className') ||
          (hasStyle && jsxAttrName(attr) === 'style') ||
          handlerNames.has(jsxAttrName(attr)))
      ),
  )

  // Child's children content (for non-self-closing child elements)
  const childContent = ts.isJsxElement(child) ? child.children : undefined

  // Spread: `{..._p}`
  const spreadProp = factory.createJsxSpreadAttribute(factory.createIdentifier('_p'))

  // Extra attrs placed after spread so they override _p values.
  const extraAttrs: ts.JsxAttributeLike[] = []

  // Merged className: `_p.className + ' childCls'`
  if (hasStaticCls && clsResult.value !== '') {
    const mergedExpr = factory.createBinaryExpression(
      factory.createPropertyAccessExpression(factory.createIdentifier('_p'), 'className'),
      ts.SyntaxKind.PlusToken,
      factory.createStringLiteral(` ${clsResult.value}`),
    )
    extraAttrs.push(
      factory.createJsxAttribute(
        factory.createIdentifier('className'),
        factory.createJsxExpression(undefined, mergedExpr),
      ),
    )
  }

  // Merged style: `{..._p.style, ...childStyleExpr}` or inlined object properties.
  if (hasStyle) {
    const styleExpr = styleInfo.expr
    const pStyleSpread = factory.createSpreadAssignment(
      factory.createPropertyAccessExpression(factory.createIdentifier('_p'), 'style'),
    )
    let mergedStyleObj: ts.ObjectLiteralExpression
    if (ts.isObjectLiteralExpression(styleExpr)) {
      // Inline child's properties directly after _p.style spread.
      mergedStyleObj = factory.createObjectLiteralExpression(
        [pStyleSpread, ...styleExpr.properties],
        false,
      )
    } else {
      // Non-literal expression: spread it.
      mergedStyleObj = factory.createObjectLiteralExpression(
        [pStyleSpread, factory.createSpreadAssignment(styleExpr)],
        false,
      )
    }
    extraAttrs.push(
      factory.createJsxAttribute(
        factory.createIdentifier('style'),
        factory.createJsxExpression(undefined, mergedStyleObj),
      ),
    )
  }

  // Composed event handlers: `(_e) => { (childHandler)(_e); _p.name?.(_e); }`
  for (const { name, expr } of handlers) {
    const eParam = factory.createParameterDeclaration(undefined, undefined, '_e')
    const callChild = factory.createExpressionStatement(
      factory.createCallExpression(factory.createParenthesizedExpression(expr), undefined, [
        factory.createIdentifier('_e'),
      ]),
    )
    const callParent = factory.createExpressionStatement(
      factory.createCallChain(
        factory.createPropertyAccessExpression(factory.createIdentifier('_p'), name),
        factory.createToken(ts.SyntaxKind.QuestionDotToken),
        undefined,
        [factory.createIdentifier('_e')],
      ),
    )
    const composedFn = factory.createArrowFunction(
      undefined,
      undefined,
      [eParam],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createBlock([callChild, callParent], true),
    )
    extraAttrs.push(
      factory.createJsxAttribute(
        factory.createIdentifier(name),
        factory.createJsxExpression(undefined, composedFn),
      ),
    )
  }

  // Reconstruct the child element with child's own attrs + spread (+ overrides)
  const childAttrsWithSpread = factory.createJsxAttributes([
    ...childOpeningAttrs,
    spreadProp,
    ...extraAttrs,
  ])

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

      // null means className is dynamic — bail since we cannot safely merge it.
      const clsResult = getStaticClassName(child)
      if (clsResult === null) return ts.visitEachChild(node, visit, context)

      // null means style is present but cannot be handled — bail.
      const styleInfo = getStyleInfo(child)
      if (styleInfo === null) return ts.visitEachChild(node, visit, context)

      // null means a handler lacks an expression — bail.
      const handlers = getEventHandlers(child)
      if (handlers === null) return ts.visitEachChild(node, visit, context)

      const childTag = getTagName(child)
      if (!childTag) return ts.visitEachChild(node, visit, context)

      // All conditions met — emit render-prop form as a self-closing element.
      const newAttrs = buildTransformedAttributes(
        factory,
        opening,
        child,
        childTag,
        clsResult,
        styleInfo,
        handlers,
      )

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
