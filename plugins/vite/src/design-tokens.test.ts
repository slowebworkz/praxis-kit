import { layoutKeys } from '@praxis-kit/tailwind'
import { describe, expect, it, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import { buildManifest, collectFileTokens, designTokensPlugin } from './design-tokens'
import { parseSource } from './ast'

vi.mock('node:fs', () => ({ writeFileSync: vi.fn() }))
const writeMock = vi.mocked(writeFileSync)

const CALLEE = new Set(['createContractComponent'])

function parse(src: string) {
  return parseSource('test.ts', src)
}

// ─── collectFileTokens ────────────────────────────────────────────────────────

describe('collectFileTokens', () => {
  it('returns empty map when no factory calls', () => {
    const tokens = collectFileTokens(parse('const x = 1'), CALLEE)
    expect(tokens.size).toBe(0)
  })

  it('collects base class', () => {
    const tokens = collectFileTokens(
      parse(`const Button = createContractComponent({ styling: { base: 'btn' } })`),
      CALLEE,
    )
    expect(tokens.get('Button')?.base).toEqual(['btn'])
  })

  it('collects variant classes', () => {
    const tokens = collectFileTokens(
      parse(
        `const Button = createContractComponent({ styling: { variants: { size: { sm: 'btn-sm', md: 'btn-md' } } } })`,
      ),
      CALLEE,
    )
    const t = tokens.get('Button')!
    expect(t.variantClasses).toContain('btn-sm')
    expect(t.variantClasses).toContain('btn-md')
  })

  it('collects array-valued variant classes', () => {
    const tokens = collectFileTokens(
      parse(
        `const B = createContractComponent({ styling: { variants: { size: { sm: ['a', 'b'] } } } })`,
      ),
      CALLEE,
    )
    expect(tokens.get('B')?.variantClasses).toEqual(['a', 'b'])
  })

  it('collects compound classes', () => {
    const tokens = collectFileTokens(
      parse(
        `const B = createContractComponent({ styling: { variants: { size: { sm: 'x' } }, compounds: [{ size: 'sm', class: 'compound-cls' }] } })`,
      ),
      CALLEE,
    )
    expect(tokens.get('B')?.compoundClasses).toContain('compound-cls')
  })

  it('collects tag-map classes', () => {
    const tokens = collectFileTokens(
      parse(`const B = createContractComponent({ styling: { tags: { a: 'link-style' } } })`),
      CALLEE,
    )
    expect(tokens.get('B')?.tagClasses).toContain('link-style')
  })

  it('collects multiple components from the same file', () => {
    const src = `
      const Button = createContractComponent({ styling: { base: 'btn' } })
      const Card = createContractComponent({ styling: { base: 'card' } })
    `
    const tokens = collectFileTokens(parse(src), CALLEE)
    expect(tokens.size).toBe(2)
    expect(tokens.get('Button')?.base).toEqual(['btn'])
    expect(tokens.get('Card')?.base).toEqual(['card'])
  })

  it('skips factory calls without a styling property', () => {
    const tokens = collectFileTokens(
      parse(`const B = createContractComponent({ tag: 'button' })`),
      CALLEE,
    )
    expect(tokens.size).toBe(0)
  })
})

// ─── buildManifest ────────────────────────────────────────────────────────────

describe('buildManifest', () => {
  it('produces an empty component map for empty input, but still safelists layout classes', () => {
    const manifest = buildManifest(new Map())
    expect(manifest.components).toEqual({})
    expect(manifest.allClasses).toEqual([...layoutKeys].sort())
  })

  it('unions all class parts in allClasses', () => {
    const tokens = new Map([
      [
        'Button',
        {
          base: ['btn'],
          variantClasses: ['btn-sm btn-md'],
          compoundClasses: ['special'],
          tagClasses: ['link'],
        },
      ],
    ])
    const manifest = buildManifest(tokens)
    expect(manifest.allClasses).toContain('btn')
    expect(manifest.allClasses).toContain('btn-sm')
    expect(manifest.allClasses).toContain('btn-md')
    expect(manifest.allClasses).toContain('special')
    expect(manifest.allClasses).toContain('link')
  })

  it('deduplicates classes across components', () => {
    const tokens = new Map([
      ['A', { base: ['shared'], variantClasses: [], compoundClasses: [], tagClasses: [] }],
      ['B', { base: ['shared'], variantClasses: [], compoundClasses: [], tagClasses: [] }],
    ])
    const { allClasses } = buildManifest(tokens)
    expect(allClasses.filter((c) => c === 'shared').length).toBe(1)
  })

  it('sorts allClasses alphabetically', () => {
    const tokens = new Map([
      ['B', { base: ['zzz', 'aaa'], variantClasses: [], compoundClasses: [], tagClasses: [] }],
    ])
    const { allClasses } = buildManifest(tokens)
    expect(allClasses).toEqual([...allClasses].sort())
  })
})

describe('designTokensPlugin lifecycle', () => {
  const BTN = `const Button = createContractComponent({ styling: { base: 'btn-p' } })`
  const CARD = `const Card = createContractComponent({ styling: { base: 'card-p' } })`

  function lastManifest(): { components: Record<string, unknown> } {
    return JSON.parse(writeMock.mock.calls.at(-1)![1] as string)
  }

  it('rebuilds from scratch each build — a deleted component drops out of the manifest', () => {
    writeMock.mockClear()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- calling the Rollup hooks directly
    const plugin = designTokensPlugin() as any

    // Build 1 — both files present.
    plugin.buildStart()
    plugin.transform(BTN, '/src/Button.tsx')
    plugin.transform(CARD, '/src/Card.tsx')
    plugin.writeBundle()
    expect(Object.keys(lastManifest().components).sort()).toEqual(['Button', 'Card'])

    // Build 2 — Card.tsx deleted, so its `transform` never runs.
    plugin.buildStart()
    plugin.transform(BTN, '/src/Button.tsx')
    plugin.writeBundle()
    expect(Object.keys(lastManifest().components)).toEqual(['Button'])
  })
})
