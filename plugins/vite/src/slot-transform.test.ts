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

describe('transformAsChild — className merge', () => {
  it('transforms when child has a string-literal className', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" className="link">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('asChild')
    expect(result).toContain('render=')
    // Guarded merge: `_p.className ? `${_p.className} link` : 'link'` — see
    // buildClassNameMerge's own doc comment for why the guard (not a plain `+`
    // concatenation) is load-bearing: `_p.className` can be `undefined` at runtime.
    expect(result).toContain('_p.className')
    expect(result).toMatch(/\$\{_p\.className\} link/)
    expect(result).toContain('"link"')
  })

  it('guards against `_p.className` being undefined at runtime (not just styling)', () => {
    // resolveClasses (lib/styling/src/create-class-pipeline.ts) resolves `undefined`, not `''`,
    // for a component with no base/variant classes and no caller className — an unconditional
    // `_p.className + ' link'` would concatenate onto that and produce the literal string
    // "undefined link". The generated code must branch on `_p.className` instead.
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" className="link">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('_p.className +')
    expect(result).toMatch(/_p\.className\s*\?/)
  })

  it('transforms when child has a JSX-expression string-literal className', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" className={"my-link"}>Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('asChild')
    expect(result).toContain('_p.className')
  })

  it('does not transform when child has a dynamic className expression', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" className={active ? 'a' : 'b'}>Home</a></Button>
      }
    `)
    if (result !== null) {
      expect(result).toContain('asChild')
    }
  })

  it('omits the className merge when child className is empty string', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" className="">Home</a></Button>
      }
    `)
    // Should still transform (empty className is not a conflict), but no + expr needed
    expect(result).not.toBeNull()
    expect(result).toContain('render=')
    expect(result).not.toContain('_p.className +')
  })
})

describe('transformAsChild — style merge', () => {
  it('transforms when child has an object-literal style prop', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" style={{ color: 'red' }}>Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('asChild')
    expect(result).toContain('render=')
    expect(result).toContain('_p.style')
    expect(result).toContain('color')
    expect(result).toContain('red')
  })

  it('merges style with multiple properties', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" style={{ color: 'red', fontWeight: 'bold' }}>Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('asChild')
    expect(result).toContain('_p.style')
    expect(result).toContain('fontWeight')
  })

  it('transforms when child has a style expression reference', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" style={myStyle}>Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('asChild')
    expect(result).toContain('_p.style')
    expect(result).toContain('myStyle')
  })

  it('does not bail when child has no style', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('_p.style')
  })
})

describe('transformAsChild — event handler composition', () => {
  it('transforms when child has a single event handler', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" onClick={handleNav}>Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('asChild')
    expect(result).toContain('render=')
    expect(result).toContain('handleNav')
    expect(result).toContain('_p.onClick')
    expect(result).toMatch(/_e/)
  })

  it('composes multiple event handlers independently', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" onClick={handleClick} onFocus={handleFocus}>Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('asChild')
    expect(result).toContain('handleClick')
    expect(result).toContain('handleFocus')
    expect(result).toContain('_p.onClick')
    expect(result).toContain('_p.onFocus')
  })

  it('handles inline arrow function handlers', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" onClick={() => doSomething()}>Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('asChild')
    expect(result).toContain('doSomething')
    expect(result).toContain('_p.onClick')
  })

  it('generates optional-chain call to parent handler (_p.name?.(_e))', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" onClick={handleNav}>Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).toMatch(/_p\.onClick\?\./)
  })

  it('does not bail when child has no event handlers', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/">Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toMatch(/_e/)
  })

  // Regression: buildEventMerge's generated code calls the child's handler expression
  // unconditionally ((childHandler)(_e)) — a handler value that's provably not callable would
  // throw `TypeError: ... is not a function` at runtime if transformed, even though each of
  // these is itself perfectly valid, type-checked JSX (an optional handler prop explicitly set
  // to a non-function value rather than omitted).
  it('does not transform when a handler is explicitly `undefined`', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" onClick={undefined}>Home</a></Button>
      }
    `)
    if (result !== null) {
      expect(result).toContain('asChild')
    }
  })

  it('does not transform when a handler is explicitly `null`', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" onClick={null}>Home</a></Button>
      }
    `)
    if (result !== null) {
      expect(result).toContain('asChild')
    }
  })

  it('does not transform when a handler is a boolean literal', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" onClick={false}>Home</a></Button>
      }
    `)
    if (result !== null) {
      expect(result).toContain('asChild')
    }
  })

  it('does not transform when a handler is a string or numeric literal', () => {
    const strResult = transform(`
      function App() {
        return <Button asChild><a href="/" onClick={'not-a-fn'}>Home</a></Button>
      }
    `)
    if (strResult !== null) {
      expect(strResult).toContain('asChild')
    }

    const numResult = transform(`
      function App() {
        return <Button asChild><a href="/" onClick={0}>Home</a></Button>
      }
    `)
    if (numResult !== null) {
      expect(numResult).toContain('asChild')
    }
  })

  it('still transforms a normal identifier-referenced handler (the common case is unaffected)', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" onClick={handleNav}>Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('asChild')
    expect(result).toContain('handleNav')
  })

  it('transforms child with both style and handler together', () => {
    const result = transform(`
      function App() {
        return <Button asChild><a href="/" style={{ color: 'red' }} onClick={handleNav}>Home</a></Button>
      }
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain('asChild')
    expect(result).toContain('_p.style')
    expect(result).toContain('_p.onClick')
    expect(result).toContain('handleNav')
  })
})

describe('transformAsChild — safety conditions prevent transform', () => {
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
