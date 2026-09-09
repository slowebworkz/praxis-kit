import { describe, it, expect } from 'vitest'
import ts from 'typescript'
import { parseSource } from './ast'

// `parseDiagnostics` is a real property on the node the parser returns but is not on the public
// `SourceFile` type.
function parseErrorCount(sf: ts.SourceFile): number {
  return (sf as unknown as { parseDiagnostics?: readonly unknown[] }).parseDiagnostics?.length ?? 0
}

function has(sf: ts.SourceFile, predicate: (node: ts.Node) => boolean): boolean {
  let found = false
  const visit = (node: ts.Node): void => {
    if (predicate(node)) found = true
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

describe('parseSource — ScriptKind is derived from the extension', () => {
  it('parses `<T>expr` in a .ts file as a type assertion, not broken JSX', () => {
    const sf = parseSource('x.ts', 'const n = <number>someValue')
    expect(parseErrorCount(sf)).toBe(0)
    expect(has(sf, ts.isTypeAssertionExpression)).toBe(true)
  })

  it('parses JSX in a .tsx file', () => {
    const sf = parseSource('x.tsx', 'const el = <div className="a" />')
    expect(parseErrorCount(sf)).toBe(0)
    expect(has(sf, ts.isJsxSelfClosingElement)).toBe(true)
  })

  it('falls back to TSX for an unknown extension', () => {
    const sf = parseSource('x.vue', 'const el = <div />')
    expect(has(sf, ts.isJsxSelfClosingElement)).toBe(true)
  })
})
