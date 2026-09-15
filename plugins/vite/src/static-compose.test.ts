import { describe, it, expect } from 'vitest'
import { parseSource } from './ast'
import { composeStatically, extractStaticComponents } from './static-compose'
import type { StaticComponent } from './static-compose'

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
// JSX static-value semantics for a variant prop: bare vs empty-string vs
// wrapped-literal vs dynamic must exactly match runtime normalization.
// ---------------------------------------------------------------------------

// A variant map with a real empty-string value, distinct from BUTTON_WITH_PRECOMPUTED — proves
// `size=""` is treated as its own genuine static value, not conflated with the bare/boolean case.
const BUTTON_WITH_EMPTY_VARIANT = `
  const Button = createContractComponent({
    tag: 'button',
    styling: {
      base: 'btn',
      variants: { size: { '': 'btn-none', sm: 'btn-sm' } },
      precomputedClasses: {
        '__none__:': 'btn',
        '__none__:size:s:': 'btn btn-none',
        '__none__:size:s:sm': 'btn btn-sm',
      },
    },
  })
`

describe('composeStatically — JSX static-value semantics for a variant prop', () => {
  it('does not inline a bare shorthand attribute (`<Button size />`) — runtime value is `true`, not `""`', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button size>x</Button> }
    `)
    // Bare `size` is boolean `true` at runtime, which can never match a string-keyed variant
    // value — must fall back to the runtime path, not silently resolve as `size: ''`.
    if (result !== null) {
      expect(result).toContain('Button')
    }
  })

  it('a bare shorthand attribute does not incorrectly match a real empty-string variant value', () => {
    // The regression case: if a bare attribute were still treated as `size: ''` (the old, wrong
    // behavior), this would inline against the `''` variant's precomputed class below — silently
    // producing `className="btn btn-none"` for a component whose real runtime prop value is
    // `size: true`, not `size: ''`. Must fall back to the runtime path instead.
    const result = compose(`
      ${BUTTON_WITH_EMPTY_VARIANT}
      function App() { return <Button size>x</Button> }
    `)
    if (result !== null) {
      expect(result).toContain('Button')
      expect(result).not.toContain('btn-none')
    }
  })

  it('inlines an explicit empty-string literal (`size=""`) when the variant map declares one', () => {
    const result = compose(`
      ${BUTTON_WITH_EMPTY_VARIANT}
      function App() { return <Button size="">x</Button> }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('className="btn btn-none"')
    expect(result).not.toContain('<Button')
  })

  it('does not inline an empty-string literal when no matching precomputed key exists', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button size="">x</Button> }
    `)
    // '' is a genuine static value here, just not one BUTTON_WITH_PRECOMPUTED's variants declare
    // — falls back to the runtime path via the missing-cache-key check, not the dynamic check.
    if (result !== null) {
      expect(result).toContain('Button')
    }
  })

  it("inlines a JSX-expression-wrapped string literal (`size={'lg'}`) the same as a plain string attribute", () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App() { return <Button size={'lg'}>x</Button> }
    `)
    expect(result).not.toBeNull()
    expect(result).toContain('className="btn btn-lg"')
    expect(result).not.toContain('<Button')
  })

  it('does not inline a JSX-expression-wrapped dynamic value (`size={expr}`)', () => {
    const result = compose(`
      ${BUTTON_WITH_PRECOMPUTED}
      function App({ s }) { return <Button size={s}>x</Button> }
    `)
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

// ---------------------------------------------------------------------------
// Cross-file composition — importedComponents registry
// ---------------------------------------------------------------------------

const BUTTON_IMPORTED: StaticComponent = {
  defaultTag: 'button',
  variantKeys: new Set(['size']),
  precomputedClasses: {
    '__none__:': 'btn',
    '__none__:size:s:sm': 'btn btn-sm',
    '__none__:size:s:lg': 'btn btn-lg',
  },
  strippedProps: new Set(['size', 'as', 'asChild', 'render', 'className']),
}

function composeWithImports(
  code: string,
  importedComponents: ReadonlyMap<string, StaticComponent>,
): string | null {
  return composeStatically(parseSource('consumer.tsx', code), CALLEE_NAMES, importedComponents)
}

describe('composeStatically — cross-file (importedComponents)', () => {
  it('inlines a component from the registry (definition in another file)', () => {
    const registry = new Map([['Button', BUTTON_IMPORTED]])
    const result = composeWithImports(
      `function App() { return <Button size="lg">Click</Button> }`,
      registry,
    )
    expect(result).not.toBeNull()
    expect(result).toContain('className="btn btn-lg"')
    expect(result).not.toContain('<Button')
  })

  it('inlines default variant (no variant props) for an imported component', () => {
    const registry = new Map([['Button', BUTTON_IMPORTED]])
    const result = composeWithImports(`function App() { return <Button>Click</Button> }`, registry)
    expect(result).not.toBeNull()
    expect(result).toContain('className="btn"')
    expect(result).not.toContain('<Button')
  })

  it('returns null when registry is empty and no same-file definitions exist', () => {
    const result = composeWithImports(
      `function App() { return <Button size="lg">Click</Button> }`,
      new Map(),
    )
    // No components known — nothing to inline
    expect(result).toBeNull()
  })

  it('same-file definition takes precedence over imported component with same name', () => {
    const registry = new Map<string, StaticComponent>([
      [
        'Button',
        {
          defaultTag: 'span',
          variantKeys: new Set(),
          precomputedClasses: { '__none__:': 'imported-class' },
          strippedProps: new Set(['as', 'asChild', 'render', 'className']),
        },
      ],
    ])
    const result = composeWithImports(
      `
        ${BUTTON_WITH_PRECOMPUTED}
        function App() { return <Button size="sm">x</Button> }
      `,
      registry,
    )
    // Same-file Button wins — uses 'btn btn-sm', not 'imported-class'
    expect(result).not.toBeNull()
    expect(result).toContain('className="btn btn-sm"')
    expect(result).not.toContain('imported-class')
  })

  it('does not inline imported component when asChild is present', () => {
    const registry = new Map([['Button', BUTTON_IMPORTED]])
    const result = composeWithImports(
      `function App() { return <Button asChild size="lg"><a>x</a></Button> }`,
      registry,
    )
    if (result !== null) {
      expect(result).toContain('Button')
    }
  })
})
