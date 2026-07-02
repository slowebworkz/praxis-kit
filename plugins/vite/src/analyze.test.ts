import { describe, it, expect } from 'vitest'
import { analyze } from './analyze'

const FILE = 'test.tsx'

describe('analyze — no diagnostics', () => {
  it('ignores non-JSX files', () => {
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
    `
    expect(analyze(code, 'test.ts')).toEqual([])
  })

  it('ignores factory calls with no enforcement.children', () => {
    const code = `
      const Box = createPolymorphicComponent({ tag: 'div', styling: { base: 'box' } })
      function App() { return <Box><span /></Box> }
    `
    expect(analyze(code, FILE)).toEqual([])
  })

  it('ignores factory calls with dynamic children array', () => {
    const code = `
      const rules = [{ name: 'x', match: (c) => true }]
      const Box = createPolymorphicComponent({ tag: 'div', enforcement: { children: rules } })
      function App() { return <Box><span /></Box> }
    `
    expect(analyze(code, FILE)).toEqual([])
  })

  it('skips JSX usages that contain expressions', () => {
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App({ label }: { label: string }) {
        return <Button>{label}</Button>
      }
    `
    expect(analyze(code, FILE)).toEqual([])
  })

  it('passes when child count is exactly within bounds', () => {
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App() { return <Button><span>click</span></Button> }
    `
    expect(analyze(code, FILE)).toEqual([])
  })

  it('passes when no cardinality is specified (unbounded — any count valid)', () => {
    const code = `
      const Box = createPolymorphicComponent({
        tag: 'div',
        enforcement: { strict: 'warn', children: [{ name: 'item', match: (c) => true }] },
      })
      function App() { return <Box><span /><span /><span /></Box> }
    `
    expect(analyze(code, FILE)).toEqual([])
  })

  it('passes when child count is within a min-max range', () => {
    const code = `
      const Group = createPolymorphicComponent({
        tag: 'div',
        enforcement: { strict: 'warn', children: [{ name: 'item', match: (c) => true, cardinality: { min: 1, max: 3 } }] },
      })
      function App() { return <Group><span /><span /></Group> }
    `
    expect(analyze(code, FILE)).toEqual([])
  })

  it('skips when {cond && <El />} is ambiguous against a min:1 constraint', () => {
    // Range [0, 1] overlaps [1, 1] — we cannot be certain it's a violation.
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App({ show }: { show: boolean }) {
        return <Button>{show && <span>label</span>}</Button>
      }
    `
    expect(analyze(code, FILE)).toEqual([])
  })

  it('skips when a ternary can satisfy the constraint on either branch', () => {
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 2 } }] },
      })
      function App({ flag }: { flag: boolean }) {
        return <Button>{flag ? <span /> : <span><em /></span>}</Button>
      }
    `
    expect(analyze(code, FILE)).toEqual([])
  })
})

describe('analyze — diagnostics emitted', () => {
  it('warns when child count exceeds max', () => {
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App() {
        return (
          <Button>
            <span>one</span>
            <span>two</span>
          </Button>
        )
      }
    `
    const result = analyze(code, FILE)
    expect(result).toHaveLength(1)
    expect(result[0]!.diagnostic.message).toContain('<Button>')
    expect(result[0]!.diagnostic.message).toContain('exactly 1 child')
    expect(result[0]!.diagnostic.message).toContain('received 2')
    expect(result[0]!.severity).toBe('warning')
  })

  it('warns when child count is below min', () => {
    const code = `
      const Banner = createPolymorphicComponent({
        tag: 'div',
        enforcement: { strict: 'warn', children: [{ name: 'content', match: (c) => true, cardinality: { min: 2, max: 4 } }] },
      })
      function App() { return <Banner><span /></Banner> }
    `
    const result = analyze(code, FILE)
    expect(result).toHaveLength(1)
    expect(result[0]!.diagnostic.message).toContain('<Banner>')
    expect(result[0]!.diagnostic.message).toContain('2–4 children')
    expect(result[0]!.diagnostic.message).toContain('received 1')
  })

  it('emits error severity when configured', () => {
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App() { return <Button><span /><span /></Button> }
    `
    const result = analyze(code, FILE, { severity: 'error' })
    expect(result).toHaveLength(1)
    expect(result[0]!.severity).toBe('error')
  })

  it('accumulates diagnostics across multiple usages', () => {
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App() {
        return (
          <div>
            <Button />
            <Button><span /><span /></Button>
          </div>
        )
      }
    `
    const result = analyze(code, FILE)
    expect(result).toHaveLength(2)
  })

  it('handles createContractComponent as an alias', () => {
    const code = `
      const Button = createContractComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App() { return <Button><span /><span /></Button> }
    `
    const result = analyze(code, FILE)
    expect(result).toHaveLength(1)
  })

  it('respects custom calleeNames option', () => {
    const code = `
      const Button = myFactory({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App() { return <Button><span /><span /></Button> }
    `
    const withDefault = analyze(code, FILE)
    expect(withDefault).toHaveLength(0)

    const withCustom = analyze(code, FILE, { calleeNames: ['myFactory'] })
    expect(withCustom).toHaveLength(1)
  })

  it('handles multi-rule aggregate bounds', () => {
    // Two rules: icon (max 1) + label (min 1, max 1) → totalMin=1, totalMax=2
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [
          { name: 'icon', match: (c) => true, cardinality: { min: 0, max: 1 } },
          { name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } },
        ]},
      })
      function App() {
        return <Button><span /><span /><span /></Button>
      }
    `
    const result = analyze(code, FILE)
    expect(result).toHaveLength(1)
    expect(result[0]!.diagnostic.message).toContain('1–2 children')
    expect(result[0]!.diagnostic.message).toContain('received 3')
  })

  it('treats {false} and {null} as zero children', () => {
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App() { return <Button>{false}{null}</Button> }
    `
    const result = analyze(code, FILE)
    expect(result).toHaveLength(1)
    expect(result[0]!.diagnostic.message).toContain('received 0')
  })

  it('fires when {cond && <El />} certainly misses a min:2 constraint', () => {
    // Range [0, 1]; totalMin=2 → count.max (1) < totalMin (2) — certainly a violation.
    const code = `
      const Banner = createPolymorphicComponent({
        tag: 'div',
        enforcement: { strict: 'warn', children: [{ name: 'item', match: (c) => true, cardinality: { min: 2, max: 4 } }] },
      })
      function App({ show }: { show: boolean }) {
        return <Banner>{show && <span />}</Banner>
      }
    `
    const result = analyze(code, FILE)
    expect(result).toHaveLength(1)
    expect(result[0]!.diagnostic.message).toContain('2–4 children')
    expect(result[0]!.diagnostic.message).toContain('received 0–1')
  })

  it('fires with a range message when a ternary always violates', () => {
    // Both branches have 2 children; constraint is max 1.
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App({ flag }: { flag: boolean }) {
        return (
          <Button>
            {flag ? (
              <><span /><span /></>
            ) : (
              <><em /><em /></>
            )}
          </Button>
        )
      }
    `
    const result = analyze(code, FILE)
    expect(result).toHaveLength(1)
    expect(result[0]!.diagnostic.message).toContain('exactly 1 child')
    expect(result[0]!.diagnostic.message).toContain('received 2')
  })

  it('treats {false} and {null} as zero children', () => {
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App() { return <Button>{false}{null}</Button> }
    `
    const result = analyze(code, FILE)
    expect(result).toHaveLength(1)
    expect(result[0]!.diagnostic.message).toContain('received 0')
  })

  it('fires when {cond && <El />} certainly misses a min:2 constraint', () => {
    // Range [0, 1]; totalMin=2 → count.max (1) < totalMin (2) — certainly a violation.
    const code = `
      const Banner = createPolymorphicComponent({
        tag: 'div',
        enforcement: { strict: 'warn', children: [{ name: 'item', match: (c) => true, cardinality: { min: 2, max: 4 } }] },
      })
      function App({ show }: { show: boolean }) {
        return <Banner>{show && <span />}</Banner>
      }
    `
    const result = analyze(code, FILE)
    expect(result).toHaveLength(1)
    expect(result[0]!.diagnostic.message).toContain('2–4 children')
    expect(result[0]!.diagnostic.message).toContain('received 0–1')
  })

  it('fires with a range message when a ternary always violates', () => {
    // Both branches have 2 children; constraint is max 1.
    const code = `
      const Button = createPolymorphicComponent({
        tag: 'button',
        enforcement: { strict: 'warn', children: [{ name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
      })
      function App({ flag }: { flag: boolean }) {
        return (
          <Button>
            {flag ? (
              <><span /><span /></>
            ) : (
              <><em /><em /></>
            )}
          </Button>
        )
      }
    `
    const result = analyze(code, FILE)
    expect(result).toHaveLength(1)
    expect(result[0]!.diagnostic.message).toContain('exactly 1 child')
    expect(result[0]!.diagnostic.message).toContain('received 2')
  })

  it('reports line and column position', () => {
    const code = `const Button = createPolymorphicComponent({
  tag: 'button',
  enforcement: { strict: 'warn', children: [{ name: 'l', match: (c) => true, cardinality: { min: 1, max: 1 } }] },
})
function App() {
  return <Button><span /><span /></Button>
}`
    const result = analyze(code, FILE)
    expect(result).toHaveLength(1)
    expect(result[0]!.line).toBe(6)
    expect(result[0]!.col).toBeGreaterThan(0)
  })
})
