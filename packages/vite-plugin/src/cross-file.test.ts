import { describe, it, expect } from 'vitest'
import { parseSource } from './ast'
import { collectConstraints } from './collect'
import { collectJsxUsages } from './diagnose'
import { extractImportSpecifiers } from './imports'
import { ConstraintRegistry } from './registry'

// ---------------------------------------------------------------------------
// extractImportSpecifiers
// ---------------------------------------------------------------------------

describe('extractImportSpecifiers', () => {
  it('extracts a named import', () => {
    const source = parseSource('test.tsx', `import { Button } from './button'`)
    expect(extractImportSpecifiers(source).get('Button')).toBe('./button')
  })

  it('extracts multiple names from one declaration', () => {
    const source = parseSource('test.tsx', `import { Button, Icon } from './ui'`)
    const imports = extractImportSpecifiers(source)
    expect(imports.get('Button')).toBe('./ui')
    expect(imports.get('Icon')).toBe('./ui')
  })

  it('extracts names across multiple import declarations', () => {
    const source = parseSource(
      'test.tsx',
      `import { Button } from './button'\nimport { Tabs } from './tabs'`,
    )
    const imports = extractImportSpecifiers(source)
    expect(imports.get('Button')).toBe('./button')
    expect(imports.get('Tabs')).toBe('./tabs')
  })

  it('uses the local alias name for aliased imports', () => {
    const source = parseSource('test.tsx', `import { Button as Btn } from './button'`)
    const imports = extractImportSpecifiers(source)
    expect(imports.get('Btn')).toBe('./button')
    expect(imports.has('Button')).toBe(false)
  })

  it('ignores default imports', () => {
    const source = parseSource('test.tsx', `import Button from './button'`)
    expect(extractImportSpecifiers(source).size).toBe(0)
  })

  it('ignores namespace imports', () => {
    const source = parseSource('test.tsx', `import * as UI from './ui'`)
    expect(extractImportSpecifiers(source).size).toBe(0)
  })

  it('returns an empty map when there are no imports', () => {
    const source = parseSource('test.tsx', `const x = 1`)
    expect(extractImportSpecifiers(source).size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// collectJsxUsages
// ---------------------------------------------------------------------------

describe('collectJsxUsages', () => {
  it('collects component usages (uppercase tag names only)', () => {
    const source = parseSource('test.tsx', `function App() { return <Button><span /></Button> }`)
    const usages = collectJsxUsages(source)
    expect(usages).toHaveLength(1)
    expect(usages[0]!.tagName).toBe('Button')
    expect(usages[0]!.count).toBe(1)
  })

  it('ignores lowercase HTML elements', () => {
    const source = parseSource(
      'test.tsx',
      `function App() { return <div><span /><p>text</p></div> }`,
    )
    expect(collectJsxUsages(source)).toHaveLength(0)
  })

  it('records undefined count when children contain a JSX expression', () => {
    const source = parseSource(
      'test.tsx',
      `function App({ child }) { return <Button>{child}</Button> }`,
    )
    const usages = collectJsxUsages(source)
    expect(usages[0]!.count).toBeUndefined()
  })

  it('records count 0 for self-closing elements', () => {
    const source = parseSource('test.tsx', `function App() { return <Button /> }`)
    const usages = collectJsxUsages(source)
    expect(usages[0]!.tagName).toBe('Button')
    expect(usages[0]!.count).toBe(0)
  })

  it('records line and column positions (1-based)', () => {
    const source = parseSource('test.tsx', `function App() {\n  return <Button />\n}`)
    const usages = collectJsxUsages(source)
    expect(usages[0]!.line).toBe(2)
    expect(usages[0]!.col).toBeGreaterThan(0)
  })

  it('collects multiple component usages from the same file', () => {
    const source = parseSource(
      'test.tsx',
      `function App() {
         return (
           <Wrapper>
             <Button />
             <Icon />
           </Wrapper>
         )
       }`,
    )
    const names = collectJsxUsages(source).map((u) => u.tagName)
    expect(names).toContain('Wrapper')
    expect(names).toContain('Button')
    expect(names).toContain('Icon')
  })
})

// ---------------------------------------------------------------------------
// ConstraintRegistry — cross-file resolution
// ---------------------------------------------------------------------------

describe('ConstraintRegistry', () => {
  it('resolves a constraint registered for an imported component', () => {
    const registry = new ConstraintRegistry()

    registry.registerConstraints('/abs/button.tsx', [
      {
        name: 'Button',
        rules: [{ cardinality: { kind: 'bounded', min: 1, max: 1 }, position: 'any' }],
        totalMin: 1,
        totalMax: 1,
      },
    ])
    registry.registerImports('/abs/app.tsx', new Map([['Button', '/abs/button.tsx']]))

    const c = registry.resolveConstraint('/abs/app.tsx', 'Button')
    expect(c?.name).toBe('Button')
    expect(c?.totalMin).toBe(1)
    expect(c?.totalMax).toBe(1)
  })

  it('returns undefined when the name is not in the import map', () => {
    const registry = new ConstraintRegistry()
    registry.registerImports('/abs/app.tsx', new Map())
    expect(registry.resolveConstraint('/abs/app.tsx', 'Button')).toBeUndefined()
  })

  it('returns undefined when no constraints are registered for the source file', () => {
    const registry = new ConstraintRegistry()
    registry.registerImports('/abs/app.tsx', new Map([['Button', '/abs/button.tsx']]))
    expect(registry.resolveConstraint('/abs/app.tsx', 'Button')).toBeUndefined()
  })

  it('returns undefined when no imports are registered for the using file', () => {
    const registry = new ConstraintRegistry()
    registry.registerConstraints('/abs/button.tsx', [
      {
        name: 'Button',
        rules: [{ cardinality: { kind: 'bounded', min: 1, max: 1 }, position: 'any' }],
        totalMin: 1,
        totalMax: 1,
      },
    ])
    expect(registry.resolveConstraint('/abs/app.tsx', 'Button')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// ConstraintRegistry.diagnostics — end-to-end cross-file validation
// ---------------------------------------------------------------------------

describe('ConstraintRegistry.diagnostics', () => {
  function buildRegistry(buttonSource: string, appSource: string) {
    const registry = new ConstraintRegistry()
    const calleeNames = new Set(['createContractComponent'])

    const buttonFile = parseSource('/abs/button.tsx', buttonSource)
    registry.registerConstraints('/abs/button.tsx', collectConstraints(buttonFile, calleeNames))

    const appFile = parseSource('/abs/app.tsx', appSource)
    const appConstraints = collectConstraints(appFile, calleeNames)
    registry.registerConstraints('/abs/app.tsx', appConstraints)

    // Simulate import resolution: './button' → '/abs/button.tsx'
    const importSpecifiers = extractImportSpecifiers(appFile)
    const resolvedImports = new Map<string, string>()
    for (const [name, specifier] of importSpecifiers) {
      resolvedImports.set(name, specifier.replace('./', '/abs/') + '.tsx')
    }
    registry.registerImports('/abs/app.tsx', resolvedImports)

    const localNames = new Set(appConstraints.map((c) => c.name))
    for (const usage of collectJsxUsages(appFile)) {
      if (!localNames.has(usage.tagName)) {
        registry.addPendingUsage('/abs/app.tsx', usage)
      }
    }

    return registry
  }

  const BUTTON_SRC = `
    export const Button = createContractComponent({
      tag: 'button',
      enforcement: { strict: 'warn', children: [
        { name: 'label', match: (c) => true, cardinality: { min: 1, max: 1 } },
      ]},
    })
  `

  it('emits a diagnostic when an imported component receives too many children', () => {
    const registry = buildRegistry(
      BUTTON_SRC,
      `import { Button } from './button'
       function App() { return <Button><span /><span /></Button> }`,
    )
    const diags = registry.diagnostics('warning')
    expect(diags).toHaveLength(1)
    expect(diags[0]!.message).toContain('<Button>')
    expect(diags[0]!.message).toContain('exactly 1 child')
    expect(diags[0]!.message).toContain('received 2')
    expect(diags[0]!.severity).toBe('warning')
    expect(diags[0]!.fileId).toBe('/abs/app.tsx')
  })

  it('emits a diagnostic when an imported component receives too few children', () => {
    const registry = buildRegistry(
      BUTTON_SRC,
      `import { Button } from './button'
       function App() { return <Button /> }`,
    )
    const diags = registry.diagnostics('warning')
    expect(diags).toHaveLength(1)
    expect(diags[0]!.message).toContain('received 0')
  })

  it('emits no diagnostic when child count is valid', () => {
    const registry = buildRegistry(
      BUTTON_SRC,
      `import { Button } from './button'
       function App() { return <Button><span>label</span></Button> }`,
    )
    expect(registry.diagnostics('warning')).toHaveLength(0)
  })

  it('skips usages with dynamic children', () => {
    const registry = buildRegistry(
      BUTTON_SRC,
      `import { Button } from './button'
       function App({ label }) { return <Button>{label}</Button> }`,
    )
    expect(registry.diagnostics('warning')).toHaveLength(0)
  })

  it('respects error severity', () => {
    const registry = buildRegistry(
      BUTTON_SRC,
      `import { Button } from './button'
       function App() { return <Button /> }`,
    )
    expect(registry.diagnostics('error')[0]!.severity).toBe('error')
  })

  it('accumulates diagnostics across multiple usages', () => {
    const registry = buildRegistry(
      BUTTON_SRC,
      `import { Button } from './button'
       function App() {
         return (
           <div>
             <Button />
             <Button><span /><span /></Button>
           </div>
         )
       }`,
    )
    expect(registry.diagnostics('warning')).toHaveLength(2)
  })

  it('emits no diagnostic when the imported name has no registered constraint', () => {
    const registry = new ConstraintRegistry()
    // No constraints registered for button.tsx
    registry.registerImports('/abs/app.tsx', new Map([['Button', '/abs/button.tsx']]))
    registry.addPendingUsage('/abs/app.tsx', { tagName: 'Button', count: 0, line: 1, col: 1 })
    expect(registry.diagnostics('warning')).toHaveLength(0)
  })
})
