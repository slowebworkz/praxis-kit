/**
 * Small, shared JSX-AST vocabulary used by more than one transform/analysis file in this
 * package (`diagnose.ts`, `slot-transform.ts`) — kept to genuinely-common helpers only, not a
 * general dumping ground; see each function's own doc comment for exactly what it decides.
 */
import ts from 'typescript'

/**
 * Returns a JSX tag name's identifier text, or `undefined` when the tag name isn't a plain
 * identifier (e.g. a namespaced or member-access tag like `<foo.Bar />`).
 *
 * Deliberately narrow: only `ts.Identifier` is supported today. `ts.JsxTagNameExpression` also
 * allows `PropertyAccessExpression`/`ThisExpression`/`JsxNamespacedName`, none of which any
 * factory-based Praxis component can produce — add support only if the plugin actually needs to
 * recognize a namespaced/member-access component tag, not speculatively.
 */
export function getJsxTagName(tagName: ts.JsxTagNameExpression): string | undefined {
  return ts.isIdentifier(tagName) ? tagName.text : undefined
}

/**
 * Returns true when `tagName` starts with an uppercase ASCII letter (A–Z) — JSX's own convention
 * for "this is a component reference, not an intrinsic HTML tag" (`<Button>` vs `<button>`).
 * Charcode comparison, not a `/^[A-Z]/` regex: this runs once per JSX site during a hot
 * build-time AST walk, and a charcode check avoids the (admittedly small) regex engine overhead
 * for a check this simple.
 */
export function isComponentTagName(tagName: string): boolean {
  const code = tagName.charCodeAt(0)
  return code >= 65 && code <= 90
}
