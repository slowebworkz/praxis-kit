import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import {
  buildCacheKey,
  buildPrecomputedClasses,
  enumerateCombinations,
  injectPrecomputedClasses,
} from './class-extract'
import { parseSource } from './ast'
import { iterate } from '@praxis-kit/primitive'

const CALLEE_NAMES = new Set(['createContractComponent'])

// ─── Test helper ──────────────────────────────────────────────────────────────

function parseStylingObj(stylingSource: string): ts.ObjectLiteralExpression {
  const full = `createContractComponent({ styling: ${stylingSource} })`
  const file = parseSource('test.ts', full)
  let result: ts.ObjectLiteralExpression | undefined

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'createContractComponent'
    ) {
      const arg = node.arguments[0]
      if (arg && ts.isObjectLiteralExpression(arg)) {
        iterate.forEach(arg.properties, (p) => {
          if (
            ts.isPropertyAssignment(p) &&
            ts.isIdentifier(p.name) &&
            p.name.text === 'styling' &&
            ts.isObjectLiteralExpression(p.initializer)
          ) {
            result = p.initializer
          }
        })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(file)
  if (!result) throw new Error(`Could not extract styling object from: ${stylingSource}`)
  return result
}

// ─── buildCacheKey ────────────────────────────────────────────────────────────

describe('buildCacheKey', () => {
  it('builds an empty key for no props', () => {
    expect(buildCacheKey({})).toBe('__none__:')
  })

  it('includes a single prop', () => {
    expect(buildCacheKey({ size: 'sm' })).toBe('__none__:size:s:sm')
  })

  it('sorts multiple props alphabetically', () => {
    expect(buildCacheKey({ size: 'sm', intent: 'primary' })).toBe(
      '__none__:intent:s:primary|size:s:sm',
    )
  })
})

// ─── enumerateCombinations ────────────────────────────────────────────────────

describe('enumerateCombinations', () => {
  it('returns single empty combo for empty variant map', () => {
    expect(enumerateCombinations({})).toEqual([{}])
  })

  it('includes absent case for each dimension', () => {
    const combos = enumerateCombinations({ size: { sm: 'a', md: 'b' } })
    expect(combos).not.toBeNull()
    expect(combos!.length).toBe(3) // absent, sm, md
    expect(combos).toContainEqual({})
    expect(combos).toContainEqual({ size: 'sm' })
    expect(combos).toContainEqual({ size: 'md' })
  })

  it('cross-products multiple dimensions', () => {
    const combos = enumerateCombinations({
      size: { sm: 'x', md: 'y' },
      intent: { primary: 'a' },
    })
    expect(combos).not.toBeNull()
    expect(combos!.length).toBe(6) // (2+1)*(1+1)
  })

  it('returns null when combinations exceed 512', () => {
    // 4 dims × 4 values = 5^4 = 625 > 512
    const big: Record<string, Record<string, string>> = {}
    for (let d = 0; d < 4; d++) {
      const vals: Record<string, string> = {}
      for (let v = 0; v < 4; v++) vals[`v${v}`] = `c${v}`
      big[`dim${d}`] = vals
    }
    expect(enumerateCombinations(big)).toBeNull()
  })
})

// ─── buildPrecomputedClasses ──────────────────────────────────────────────────

describe('buildPrecomputedClasses', () => {
  it('returns null when variants is absent', () => {
    expect(buildPrecomputedClasses(parseStylingObj('{ base: "btn" }'))).toBeNull()
  })

  it('builds map for simple single-dimension variants', () => {
    const map = buildPrecomputedClasses(
      parseStylingObj('{ variants: { size: { sm: "btn-sm", md: "btn-md" } } }'),
    )
    expect(map).not.toBeNull()
    expect(map!['__none__:']).toBe('')
    expect(map!['__none__:size:s:sm']).toBe('btn-sm')
    expect(map!['__none__:size:s:md']).toBe('btn-md')
  })

  it('applies defaults when variant is absent from props', () => {
    const map = buildPrecomputedClasses(
      parseStylingObj(
        '{ variants: { size: { sm: "s-sm", md: "s-md" } }, defaults: { size: "md" } }',
      ),
    )!
    expect(map['__none__:']).toBe('s-md')
    expect(map['__none__:size:s:sm']).toBe('s-sm')
  })

  it('combines classes from multiple dimensions', () => {
    const map = buildPrecomputedClasses(
      parseStylingObj('{ variants: { size: { sm: "s-sm" }, intent: { primary: "i-primary" } } }'),
    )!
    expect(map['__none__:intent:s:primary|size:s:sm']).toBe('s-sm i-primary')
  })

  it('handles array class values in variants', () => {
    const map = buildPrecomputedClasses(
      parseStylingObj('{ variants: { size: { sm: ["a", "b"] } } }'),
    )!
    expect(map['__none__:size:s:sm']).toBe('a b')
  })

  it('appends compound classes when all conditions match', () => {
    const map = buildPrecomputedClasses(
      parseStylingObj(
        '{ variants: { size: { sm: "s", md: "m" }, intent: { primary: "p" } }, compounds: [{ size: "sm", intent: "primary", class: "compound" }] }',
      ),
    )!
    expect(map['__none__:intent:s:primary|size:s:sm']).toBe('s p compound')
    expect(map['__none__:intent:s:primary|size:s:md']).toBe('m p')
  })

  it('supports array conditions in compounds (OR match)', () => {
    const map = buildPrecomputedClasses(
      parseStylingObj(
        '{ variants: { size: { sm: "s", lg: "l" } }, compounds: [{ size: ["sm", "lg"], class: "x" }] }',
      ),
    )!
    expect(map['__none__:size:s:sm']).toBe('s x')
    expect(map['__none__:size:s:lg']).toBe('l x')
  })

  it('returns null when a compound class is non-literal', () => {
    expect(
      buildPrecomputedClasses(
        parseStylingObj(
          '{ variants: { size: { sm: "s" } }, compounds: [{ size: "sm", class: someVar }] }',
        ),
      ),
    ).toBeNull()
  })

  it('returns null when combinations exceed 512', () => {
    const parts = ['a', 'b', 'c', 'd']
      .map((k) => `${k}: { x: "x", y: "y", z: "z", w: "w" }`)
      .join(', ')
    expect(buildPrecomputedClasses(parseStylingObj(`{ variants: { ${parts} } }`))).toBeNull()
  })

  it('returns null when precomputedClasses already present', () => {
    expect(
      buildPrecomputedClasses(
        parseStylingObj('{ variants: { size: { sm: "s" } }, precomputedClasses: {} }'),
      ),
    ).toBeNull()
  })
})

// ─── injectPrecomputedClasses ─────────────────────────────────────────────────

describe('injectPrecomputedClasses', () => {
  it('returns null when no factory calls present', () => {
    const src = parseSource('x.ts', 'const x = 1')
    expect(injectPrecomputedClasses(src, CALLEE_NAMES)).toBeNull()
  })

  it('returns null when factory call has no variants', () => {
    const src = parseSource(
      'x.ts',
      `const B = createContractComponent({ styling: { base: 'btn' } })`,
    )
    expect(injectPrecomputedClasses(src, CALLEE_NAMES)).toBeNull()
  })

  it('injects precomputedClasses into the styling object', () => {
    const src = parseSource(
      'x.ts',
      `const B = createContractComponent({ styling: { base: 'btn', variants: { size: { sm: 'btn-sm', md: 'btn-md' } } } })`,
    )
    const out = injectPrecomputedClasses(src, CALLEE_NAMES)
    expect(out).not.toBeNull()
    expect(out).toContain('precomputedClasses')
    expect(out).toContain('__none__:size:s:sm')
    expect(out).toContain('btn-sm')
    expect(out).toContain('__none__:size:s:md')
    expect(out).toContain('btn-md')
  })

  it('is idempotent when precomputedClasses already present', () => {
    const src = parseSource(
      'x.ts',
      `const B = createContractComponent({ styling: { variants: { size: { sm: 'x' } }, precomputedClasses: {} } })`,
    )
    expect(injectPrecomputedClasses(src, CALLEE_NAMES)).toBeNull()
  })
})
