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
 *      `className={_p.className ? `${_p.className} childCls` : 'childCls'}` — see
 *      `buildClassNameMerge`'s own doc comment for why the guard is load-bearing, not defensive
 *      styling.
 *   2. The child has a bare `style` or `on*` attribute without an initializer, or an `on*`
 *      attribute whose value is provably not callable (`undefined`, `null`, `true`/`false`, a
 *      numeric/string/bigint literal — see `isObviouslyNotCallable`'s own doc comment for why:
 *      the composed handler calls the child's expression unconditionally, so `onClick={undefined}`
 *      — valid, type-checked JSX — would otherwise throw `undefined is not a function` at
 *      runtime). Static object-literal and expression-valued `style` props are merged:
 *      `style={{..._p.style, ...childStyle}}`.  Event handlers are composed:
 *      `onClick={(_e) => { (childHandler)(_e); _p.onClick?.(_e); }}`.
 *   3. The component name starts with a lowercase letter (HTML intrinsic — not
 *      a polymorphic component).
 *   4. There are zero or more than one meaningful child elements.
 *
 * The transform is conservative: any condition that is not statically clear
 * causes the node to be left unchanged.
 *
 * The three generated-expression shapes above (`buildClassNameMerge`, `buildStyleMerge`,
 * `buildEventMerge`) are each their own named function, isolated from the JSX-parsing helpers
 * above them (`getStaticClassName`, `getStyleInfo`, `getEventHandlers`, …) — the parsing side
 * already had that boundary; the generation side didn't.
 */
import { iterate, isDefined, isUndefined } from '@praxis-kit/primitive'
import ts from 'typescript'
import { walk } from './ast'
import { getJsxTagName, isComponentTagName } from './jsx'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
      isDefined(init.expression) &&
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
    if (ts.isJsxExpression(init) && isDefined(init.expression))
      return { absent: false, expr: init.expression }
    return null
  }
  return { absent: true }
}

/**
 * Whether `expr` is a literal/keyword that is *provably* not callable — `undefined`, `null`,
 * `true`/`false`, or a numeric/string/bigint literal. `buildEventMerge`'s generated code calls
 * the child's own handler expression unconditionally (`(childHandler)(_e)`), so a handler prop
 * whose value is one of these throws at runtime (`undefined is not a function`) even though
 * `onClick={undefined}` is itself perfectly valid, type-checked JSX (an optional handler prop
 * left unset via an explicit value rather than omitted). Deliberately narrow: an identifier,
 * member access, call expression, or arrow/function expression is left alone and treated as
 * callable — that's the overwhelming common case this transform exists to optimize, and this
 * transform has no type checker available to verify any of those further. This only catches the
 * subset of "not callable" that's provable from syntax alone.
 */
function isObviouslyNotCallable(expr: ts.Expression): boolean {
  if (ts.isIdentifier(expr) && expr.text === 'undefined') return true
  switch (expr.kind) {
    case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
      return true
    default:
      return ts.isNumericLiteral(expr) || ts.isStringLiteral(expr) || ts.isBigIntLiteral(expr)
  }
}

/**
 * Collects all `on*` event handler props from the child element.
 *
 * Returns:
 * - Array of `{ name, expr }` for each handler (may be empty when none present)
 * - `null` when any handler lacks an expression initializer, or is a value
 *   `isObviouslyNotCallable` rejects (bail — see that function's own doc comment)
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
    if (ts.isJsxExpression(init) && isDefined(init.expression)) {
      if (isObviouslyNotCallable(init.expression)) return null
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
    if (isUndefined(attr.initializer)) return true
    if (
      ts.isJsxExpression(attr.initializer) &&
      isDefined(attr.initializer.expression) &&
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

// ─── Generated-expression builders ──────────────────────────────────────────
//
// Each of these owns one piece of runtime prop-merging semantics, isolated from both the
// JSX-parsing helpers above and the attribute-list assembly below — a boundary the parsing side
// already had (getStaticClassName/getStyleInfo/getEventHandlers), the generation side didn't.

/**
 * Builds the merged `className` expression.
 *
 * `_p.className` can genuinely be `undefined` at runtime — `resolveClasses`
 * (`lib/styling/src/create-class-pipeline.ts`) resolves to `undefined`, not `''`, for a component
 * with no base/variant classes and no caller-supplied `className` (confirmed by reading that
 * function directly, not assumed). An unconditional `_p.className + ' childCls'` would then
 * concatenate onto `undefined`, producing the literal string `"undefined childCls"` on the DOM —
 * a real bug this guard closes, not defensive styling. Generates
 * `_p.className ? `${_p.className} childCls` : 'childCls'`.
 */
function buildClassNameMerge(factory: ts.NodeFactory, childClassName: string): ts.Expression {
  const pClassName = (): ts.PropertyAccessExpression =>
    factory.createPropertyAccessExpression(factory.createIdentifier('_p'), 'className')
  const whenTrue = factory.createTemplateExpression(factory.createTemplateHead(''), [
    factory.createTemplateSpan(pClassName(), factory.createTemplateTail(` ${childClassName}`)),
  ])
  const whenFalse = factory.createStringLiteral(childClassName)
  return factory.createConditionalExpression(
    pClassName(),
    factory.createToken(ts.SyntaxKind.QuestionToken),
    whenTrue,
    factory.createToken(ts.SyntaxKind.ColonToken),
    whenFalse,
  )
}

/**
 * Builds the merged `style` object expression: `{ ..._p.style, ...childStyle }` — the child's own
 * object-literal properties are inlined directly after the `_p.style` spread when the child's
 * style is itself an object literal (readable output, e.g. `{ ..._p.style, color: 'red' }`);
 * a non-literal style expression (a variable reference) is spread instead, since its own shape
 * isn't known statically.
 */
function buildStyleMerge(
  factory: ts.NodeFactory,
  styleExpr: ts.Expression,
): ts.ObjectLiteralExpression {
  const pStyleSpread = factory.createSpreadAssignment(
    factory.createPropertyAccessExpression(factory.createIdentifier('_p'), 'style'),
  )
  if (ts.isObjectLiteralExpression(styleExpr)) {
    return factory.createObjectLiteralExpression([pStyleSpread, ...styleExpr.properties], false)
  }
  return factory.createObjectLiteralExpression(
    [pStyleSpread, factory.createSpreadAssignment(styleExpr)],
    false,
  )
}

/** Builds one composed event-handler arrow function: `(_e) => { (childHandler)(_e); _p.name?.(_e); }` —
 *  the child's own handler always runs, then the parent's (if any) via an optional-chain call, so
 *  a parent that never set this handler doesn't throw. */
function buildEventMerge(
  factory: ts.NodeFactory,
  name: string,
  childHandlerExpr: ts.Expression,
): ts.ArrowFunction {
  const eParam = factory.createParameterDeclaration(undefined, undefined, '_e')
  const callChild = factory.createExpressionStatement(
    factory.createCallExpression(
      factory.createParenthesizedExpression(childHandlerExpr),
      undefined,
      [factory.createIdentifier('_e')],
    ),
  )
  const callParent = factory.createExpressionStatement(
    factory.createCallChain(
      factory.createPropertyAccessExpression(factory.createIdentifier('_p'), name),
      factory.createToken(ts.SyntaxKind.QuestionDotToken),
      undefined,
      [factory.createIdentifier('_e')],
    ),
  )
  return factory.createArrowFunction(
    undefined,
    undefined,
    [eParam],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    factory.createBlock([callChild, callParent], true),
  )
}

/**
 * Builds the attribute list for the transformed parent, omitting `asChild`
 * and adding `render={(_p) => <childTag ...childAttrs {..._p} />}`.
 *
 * Merged props are placed after the `{..._p}` spread so they override _p — see
 * `buildClassNameMerge`/`buildStyleMerge`/`buildEventMerge` for each merge's own shape.
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
  const handlerNames = new Set(iterate.map(handlers, (h) => h.name))

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

  if (hasStaticCls && clsResult.value !== '') {
    extraAttrs.push(
      factory.createJsxAttribute(
        factory.createIdentifier('className'),
        factory.createJsxExpression(undefined, buildClassNameMerge(factory, clsResult.value)),
      ),
    )
  }

  if (hasStyle) {
    extraAttrs.push(
      factory.createJsxAttribute(
        factory.createIdentifier('style'),
        factory.createJsxExpression(undefined, buildStyleMerge(factory, styleInfo.expr)),
      ),
    )
  }

  for (const { name, expr } of handlers) {
    extraAttrs.push(
      factory.createJsxAttribute(
        factory.createIdentifier(name),
        factory.createJsxExpression(undefined, buildEventMerge(factory, name, expr)),
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
      const tagName = getJsxTagName(opening.tagName)

      if (!tagName || !isComponentTagName(tagName)) {
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
  const hasAny = iterate.some(
    walk(source),
    (node) => ts.isJsxAttribute(node) && jsxAttrName(node) === 'asChild',
  )

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
