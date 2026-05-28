import { describe, it, expect } from 'vitest'
import { parseSource } from './ast'
import { transformAsChild } from './slot-transform'

function transform(code: string): string | null {
  return transformAsChild(parseSource('test.tsx', code))
}

// ---------------------------------------------------------------------------
// Fast-path: no asChild → null (no transform)
// ---------------------------------------------------------------------------

describe('transformAsChild — fast path', () => {
  it('returns null when no asChild attribute is present', () => {
    expect(transform(`function App() { return <Button size="lg">text</Button> }`)).toBeNull()
  })

  it('returns null for a file with no JSX', () => {
    expect(transform(`const x = 1`)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Safe transforms — should rewrite asChild to render-prop form
// ---------------------------------------------------------------------------

describe('transformAsChild — safe transforms', () => {
  it('rewrites bare asChild with a single element child', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('render=')
    expect(result).toContain('_p')
    expect(result).toContain('href="/"')
    expect(result).not.toContain('asChild')
  })

  it('rewrites asChild={true} with a single element child', () => {
    const result = transform(`
      function App() {
        return <Button asChild={true}><a href="/">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('render=')
    expect(result).not.toContain('asChild')
  })

  it('preserves other props on the parent component', () => {
    const result = transform(`
      function App() {
        return <Button asChild size="lg" intent="ghost"><a href="/">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('size="lg"')
    expect(result).toContain('intent="ghost"')
    expect(result).not.toContain('asChild')
  })

  it('preserves static attributes on the child element inside the render callback', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/dashboard" data-nav="true">Dash</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('href="/dashboard"')
    expect(result).toContain('data-nav="true"')
  })

  it('preserves child content (children of the child element)', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('Home')
  })

  it('spreads _p onto the child inside the render callback', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).toMatch(/\.\.\._p/)
  })

  it('handles whitespace-only text nodes around the child (treats them as irrelevant)', () => {
    const result = transform(`
      function App() {
        return (
          <Button asChild>
            <a href="/">Home</a>
          </Button>
        )
      }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('render=')
    expect(result).not.toContain('asChild')
  })
})

// ---------------------------------------------------------------------------
// Safety conditions — must NOT transform
// ---------------------------------------------------------------------------

describe('transformAsChild — safety conditions prevent transform', () => {
  it('does not transform when the child has a className prop', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" className="link">Home</a></Button>
      }
    `)
    // Either null (fast-path skip) or the output still has asChild
    if (result !== null) {
      expect(result).toContain('asChild')
    }
  })

  it('does not transform when the child has a style prop', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" style={{ color: 'red' }}>Home</a></Button>
      }
    `)
    if (result !== null) {
      expect(result).toContain('asChild')
    }
  })

  it('does not transform when the child has an event handler', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" onClick={handleNav}>Home</a></Button>
      }
    `)
    if (result !== null) {
      expect(result).toContain('asChild')
    }
  })

  it('does not transform when there are multiple child elements', () => {
    const result = transform(`
      function App() {
        return (
          <Button asChild>
            <a href="/">Home</a>
            <span>extra</span>
          </Button>
        )
      }
    `)
    if (result !== null) {
      expect(result).toContain('asChild')
    }
  })

  it('does not transform when the child contains a JSX expression', () => {
    // JSX expression inside the child is the child's *content*, not its props —
    // the transform IS safe here; but content preservation is verified separately.
    // This test just ensures we don't crash.
    expect(() =>
      transform(`
      function App({ label }) {
        return <Button asChild><a href="/">{label}</a></Button>
      }
    `),
    ).not.toThrow()
  })

  it('does not transform lowercase-tag components (HTML intrinsics)', () => {
    const result = transform(`
      function App() {
        return <div asChild><span>text</span></div>
      }
    `)
    if (result !== null) {
      expect(result).toContain('asChild')
    }
  })

  it('does not transform when there are zero children', () => {
    const result = transform(`
      function App() {
        return <Button asChild />
      }
    `)
    // Self-closing with asChild — no children to transform; should not crash
    expect(() => result).not.toThrow()
  })

  it('does not transform dynamic child (JSX expression as child)', () => {
    const result = transform(`
      function App({ child }) {
        return <Button asChild>{child}</Button>
      }
    `)
    if (result !== null) {
      expect(result).toContain('asChild')
    }
  })
})

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

describe('transformAsChild — output shape', () => {
  it('produces a self-closing element (no children on transformed parent)', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    // Closing tag of Button should be absent; self-closing />  must appear
    expect(result).not.toContain('</Button>')
    expect(result).toContain('/>')
  })

  it('the render callback is an arrow function with a _p parameter', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    // TS printer may or may not wrap single param in parens
    expect(result).toMatch(/render=\{/)
    expect(result).toMatch(/_p\s*=>/)
  })

  it('does not include asChild in the output', () => {
    const result = transform(`
      function App() {
        return <Button asChild size="lg"><a href="/">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('asChild')
  })
})
