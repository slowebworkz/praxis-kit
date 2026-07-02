import { describe, it, expect } from 'vitest'
import { parseSource } from './ast'
import { collectConstraints } from './collect'
import { diagnoseAriaTagOverrides } from './diagnose'

const CALLEE_NAMES = new Set(['createContractComponent'])

function check(code: string) {
  const source = parseSource('test.tsx', code)
  const constraints = collectConstraints(source, CALLEE_NAMES)
  return diagnoseAriaTagOverrides(source, constraints, 'warning')
}

// ---------------------------------------------------------------------------
// No diagnostic expected
// ---------------------------------------------------------------------------

describe('diagnoseAriaTagOverrides — no diagnostics', () => {
  it('emits nothing when component has no ARIA rules', () => {
    expect(
      check(`
        const Btn = createContractComponent({ tag: 'button' })
        function App() { return <Btn as="a" /> }
      `),
    ).toEqual([])
  })

  it('emits nothing when as prop matches defaultTag', () => {
    expect(
      check(`
        const Btn = createContractComponent({
          tag: 'button',
          enforcement: { strict: 'warn', aria: [() => []] },
        })
        function App() { return <Btn as="button" /> }
      `),
    ).toEqual([])
  })

  it('emits nothing when no as prop is present', () => {
    expect(
      check(`
        const Btn = createContractComponent({
          tag: 'button',
          enforcement: { strict: 'warn', aria: [() => []] },
        })
        function App() { return <Btn size="lg" /> }
      `),
    ).toEqual([])
  })

  it('emits nothing when component has no defaultTag declared', () => {
    expect(
      check(`
        const Btn = createContractComponent({
          enforcement: { strict: 'warn', aria: [() => []] },
        })
        function App() { return <Btn as="a" /> }
      `),
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Diagnostic expected
// ---------------------------------------------------------------------------

describe('diagnoseAriaTagOverrides — diagnostics emitted', () => {
  it('emits a warning when as overrides the default tag on a component with ARIA rules', () => {
    const diagnostics = check(`
      const Btn = createContractComponent({
        tag: 'button',
        enforcement: { strict: 'warn', aria: [() => []] },
      })
      function App() { return <Btn as="a" /> }
    `)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]!.diagnostic.message).toContain('as="a"')
    expect(diagnostics[0]!.diagnostic.message).toContain("'button'")
    expect(diagnostics[0]!.severity).toBe('warning')
  })

  it('emits for JSX expression string as value', () => {
    const diagnostics = check(`
      const Btn = createContractComponent({
        tag: 'button',
        enforcement: { strict: 'warn', aria: [() => []] },
      })
      function App() { return <Btn as={"a"} /> }
    `)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]!.diagnostic.message).toContain('as="a"')
  })

  it('emits once per JSX usage site (two usages → two diagnostics)', () => {
    const diagnostics = check(`
      const Btn = createContractComponent({
        tag: 'button',
        enforcement: { strict: 'warn', aria: [() => []] },
      })
      function App() {
        return (
          <>
            <Btn as="a" />
            <Btn as="div" />
          </>
        )
      }
    `)
    expect(diagnostics).toHaveLength(2)
  })

  it('does not emit for a non-override as usage (as matches defaultTag) in the same file', () => {
    const diagnostics = check(`
      const Btn = createContractComponent({
        tag: 'button',
        enforcement: { strict: 'warn', aria: [() => []] },
      })
      function App() {
        return (
          <>
            <Btn as="button" />
            <Btn as="a" />
          </>
        )
      }
    `)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]!.diagnostic.message).toContain('as="a"')
  })
})
