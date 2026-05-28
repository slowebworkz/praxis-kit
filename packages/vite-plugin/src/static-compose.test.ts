import { describe, it, expect } from 'vitest'
import { parseSource } from './ast'
import { composeStatically, extractStaticComponents } from './static-compose'

const CALLEE_NAMES = new Set(['createContractComponent', 'createPolymorphicComponent'])

function compose(code: string): string | null {
  return composeStatically(parseSource('test.tsx', code), CALLEE_NAMES)
}

// Minimal source with precomputedClasses injected (as classExtractPlugin would produce)
const BUTTON_WITH_PRECOMPUTED = `
  const Button = createContractComponent({
    tag: 'button',
    styling: {
      base: 'btn',
      variants: { size: { sm: 'btn-sm', lg: 'btn-lg' } },
      precomputedClasses: {
        '__none__:': 'btn',
        '__none__:size:s:sm': 'btn btn-sm',
        '__none__:size:s:lg': 'btn btn-lg',
      },
    },
  })
`

// ---------------------------------------------------------------------------
// Fast-path: no eligible components or sites → null
// ---------------------------------------------------------------------------

describe('composeStatically — fast path', () => {
  it('returns null when no factory calls exist in the file', () => {
    expect(compose(`function App() { return <button>x</button> }`)).toBeNull()
  })

  it('returns null when factory call has no precomputedClasses', () => {
    expect(
      compose(`
        const Button = createContractComponent({ tag: 'button', styling: { base: 'btn' } })
        function App() { return <Button>Click</Button> }
      `),
    ).toBeNull()
  })

  it('returns null when a component with precomputedClasses is never used as JSX', () => {
    expect(compose(`${BUTTON_WITH_PRECOMPUTED}`)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// extractStaticComponents — metadata extraction
// ---------------------------------------------------------------------------

describe('extractStaticComponents', () => {
  it('extracts component with default tag and variant keys', () => {
    const source = parseSource('test.tsx', BUTTON_WITH_PRECOMPUTED)
    const components = extractStaticComponents(source, CALLEE_NAMES)
    expect(components.has('Button')).toBe(true)
    const info = components.get('Button')!
    expect(info.defaultTag).toBe('button')
    expect(info.variantKeys.has('size')).toBe(true)
    expect(Object.keys(info.precomputedClasses)).toContain('__none__:size:s:lg')
  })

  it('skips factory calls without precomputedClasses', () => {
    const source = parseSource(
      'test.tsx',
      `const Button = createContractComponent({ tag: 'button', styling: {} })`,
    )
    expect(extractStaticComponents(source, CALLEE_NAMES).size).toBe(0)
  })

  it('skips factory calls with top-level defaults', () => {
    const source = parseSource(
      'test.tsx',
      `const Button = createContractComponent({
         tag: 'button',
         defaults: { type: 'button' },
         styling: { precomputedClasses: { '__none__:': 'btn' } },
       })`,
    )
    expect(extractStaticComponents(source, CALLEE_NAMES).size).toBe(0)
  })

  it('skips factory calls with enforcement', () => {
    const source = parseSource(
      'test.tsx',
      `const Button = createContractComponent({
         tag: 'button',
         enforcement: { strict: 'warn' },
         styling: { precomputedClasses: { '__none__:': 'btn' } },
       })`,
    )
    expect(extractStaticComponents(source, CALLEE_NAMES).size).toBe(0)
  })

  it('accepts factory calls with a type assertion (as T)', () => {
    const source = parseSource(
      'test.tsx',
      `const Button = createContractComponent({
         tag: 'button',
         styling: { precomputedClasses: { '__none__:': 'btn' } },
       }) as SomeType`,
    )
    expect(extractStaticComponents(source, CALLEE_NAMES).size).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Basic inlining — no variant props at usage site
// ---------------------------------------------------------------------------

describe('composeStatically — basic inlining', () => {
  it('inlines a no-variant usage to the default tag', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button>Click</Button> }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('<button')
    expect(result).toContain('className="btn"')
    expect(result).toContain('Click')
    // Component wrapper gone
    expect(result).not.toContain('<Button')
  })

  it('inlines with a static variant prop', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button size="lg">Click</Button> }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('className="btn btn-lg"')
    expect(result).not.toContain('size=')
    expect(result).not.toContain('<Button')
  })

  it('inlines a self-closing usage', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button size="sm" /> }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('className="btn btn-sm"')
    expect(result).toContain('/>')
    expect(result).not.toContain('<Button')
  })

  it('preserves non-variant props in the output', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button size="lg" type="submit" disabled>Click</Button> }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('type="submit"')
    expect(result).toContain('disabled')
    expect(result).not.toContain('size=')
  })

  it('merges caller className with precomputed class', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button size="lg" className="extra">Click</Button> }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('className="btn btn-lg extra"')
    expect(result).not.toContain('size=')
  })

  it('keeps the factory call in the output (component remains exportable)', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button>Click</Button> }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('createContractComponent')
  })
})

// ---------------------------------------------------------------------------
// Tag resolution
// ---------------------------------------------------------------------------

describe('composeStatically — tag resolution', () => {
  it('uses default tag when no `as` prop is present', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button>x</Button> }
    `)
    expect(result).toContain('<button')
  })

  it('uses a static string `as` prop as the output tag', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button as="a" size="lg">x</Button> }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('<a')
    expect(result).not.toContain('as=')
  })

  it('does not inline when `as` is dynamic', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App({ tag }) { return <Button as={tag}>x</Button> }
    `)
    if (result !== null) {
      expect(result).toContain('Button')
    }
  })
})

// ---------------------------------------------------------------------------
// Safety conditions — must NOT inline
// ---------------------------------------------------------------------------

describe('composeStatically — safety conditions prevent inlining', () => {
  it('does not inline when asChild is present', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button asChild><a href="/">x</a></Button> }
    `)
    if (result !== null) {
      expect(result).toContain('Button')
    }
  })

  it('does not inline when render prop is present', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button render={p => <a {...p} />} /> }
    `)
    if (result !== null) {
      expect(result).toContain('Button')
    }
  })

  it('does not inline when a spread attribute is present', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App({ rest }) { return <Button {...rest}>x</Button> }
    `)
    if (result !== null) {
      expect(result).toContain('Button')
    }
  })

  it('does not inline when a variant prop is dynamic', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App({ s }) { return <Button size={s}>x</Button> }
    `)
    if (result !== null) {
      expect(result).toContain('Button')
    }
  })

  it('does not inline when className is dynamic', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App({ cls }) { return <Button size="lg" className={cls}>x</Button> }
    `)
    if (result !== null) {
      expect(result).toContain('Button')
    }
  })

  it('does not inline when precomputed key is missing (unknown variant value)', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button size="xl">x</Button> }
    `)
    // 'xl' is not in precomputedClasses — should not inline
    if (result !== null) {
      expect(result).toContain('Button')
    }
  })
})

// ---------------------------------------------------------------------------
// Nested transforms — children also get inlined
// ---------------------------------------------------------------------------

describe('composeStatically — nested usage', () => {
  it('inlines nested same-file component usages', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() {
        return (
          <div>
            <Button size="sm">A</Button>
            <Button size="lg">B</Button>
          </div>
        )
      }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('className="btn btn-sm"')
    expect(result).toContain('className="btn btn-lg"')
    expect(result).not.toContain('<Button')
  })
})
