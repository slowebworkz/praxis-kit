import { describe, it, expect } from 'vitest'
import { Project } from 'ts-morph'
import { resolveReplacement } from './transforms/resolve-replacement.js'
import { renameInProject } from './transforms/rename.js'
import { migratePathsInProject } from './transforms/migrate-paths.js'

function makeProject(files: Record<string, string>): Project {
  const project = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true })
  for (const [path, content] of Object.entries(files)) {
    project.createSourceFile(path, content)
  }
  return project
}

function text(project: Project, path: string): string {
  return project.getSourceFileOrThrow(path).getFullText()
}

const opts = { isDryRun: false, isVerbose: false }
const renameOpts = {
  from: 'createPolymorphicComponent',
  to: 'createContractComponent',
  ...opts,
}

// ─── resolveReplacement ───────────────────────────────────────────────────────

describe('resolveReplacement', () => {
  it('derives praxis-kit/* from @praxis-kit/*', () => {
    expect(resolveReplacement('@praxis-kit/react')).toBe('praxis-kit/react')
    expect(resolveReplacement('@praxis-kit/react/legacy')).toBe('praxis-kit/react/legacy')
    expect(resolveReplacement('@praxis-kit/solid')).toBe('praxis-kit/solid')
  })

  it('applies special cases', () => {
    expect(resolveReplacement('@praxis-kit/eslint-plugin')).toBe('praxis-kit/eslint')
  })

  it('ignores non-praxis specifiers', () => {
    expect(resolveReplacement('react')).toBeUndefined()
    expect(resolveReplacement('praxis-kit/react')).toBeUndefined()
  })
})

// ─── renameInProject ──────────────────────────────────────────────────────────

describe('renameInProject — simple named import', () => {
  it('renames the import binding and all references', () => {
    const project = makeProject({
      'test.ts': [
        "import { createPolymorphicComponent } from '@praxis-kit/react'",
        "const Button = createPolymorphicComponent({ tag: 'button' })",
      ].join('\n'),
    })

    const result = renameInProject(project, renameOpts)

    expect(text(project, 'test.ts')).toMatchInlineSnapshot(`
      "import { createContractComponent } from '@praxis-kit/react'
      const Button = createContractComponent({ tag: 'button' })"
    `)
    expect(result.totalRenames).toBe(1)
    expect(result.filesModified).toBe(1)
  })
})

describe('renameInProject — aliased named import', () => {
  it('renames the imported symbol, leaves the alias and call sites untouched', () => {
    const project = makeProject({
      'test.ts': [
        "import { createPolymorphicComponent as poly } from '@praxis-kit/react'",
        "const Button = poly({ tag: 'button' })",
      ].join('\n'),
    })

    renameInProject(project, renameOpts)

    const result = text(project, 'test.ts')
    expect(result).toContain('createContractComponent as poly')
    expect(result).toContain("const Button = poly({ tag: 'button' })")
    expect(result).not.toContain('createPolymorphicComponent')
    // alias drives usage — the renamed symbol must NOT appear at call sites
    expect(result).not.toContain('createContractComponent({')
  })
})

describe('renameInProject — named re-export', () => {
  it('renames the exported symbol name', () => {
    const project = makeProject({
      'test.ts': "export { createPolymorphicComponent } from '@praxis-kit/react'",
    })

    const result = renameInProject(project, renameOpts)

    expect(text(project, 'test.ts')).toContain('createContractComponent')
    expect(text(project, 'test.ts')).not.toContain('createPolymorphicComponent')
    expect(result.totalRenames).toBe(1)
  })
})

describe('renameInProject — aliased named re-export', () => {
  it('renames the exported symbol, leaves the alias untouched', () => {
    const project = makeProject({
      'test.ts': "export { createPolymorphicComponent as poly } from '@praxis-kit/react'",
    })

    const result = renameInProject(project, renameOpts)

    expect(text(project, 'test.ts')).toContain('createContractComponent as poly')
    expect(text(project, 'test.ts')).not.toContain('createPolymorphicComponent')
    expect(result.totalRenames).toBe(1)
  })
})

describe('renameInProject — works after path migration (idempotent order)', () => {
  it('matches praxis-kit/* specifiers too', () => {
    const project = makeProject({
      'test.ts': [
        "import { createPolymorphicComponent } from 'praxis-kit/react'",
        "const Button = createPolymorphicComponent({ tag: 'button' })",
      ].join('\n'),
    })

    renameInProject(project, renameOpts)

    expect(text(project, 'test.ts')).toContain('createContractComponent')
    expect(text(project, 'test.ts')).not.toContain('createPolymorphicComponent')
  })
})

describe('renameInProject — ignores non-praxis imports', () => {
  it('does not rename identical names from unrelated packages', () => {
    const project = makeProject({
      'test.ts': [
        "import { createPolymorphicComponent } from 'some-other-lib'",
        'const x = createPolymorphicComponent()',
      ].join('\n'),
    })

    renameInProject(project, renameOpts)

    expect(text(project, 'test.ts')).toContain("from 'some-other-lib'")
    expect(text(project, 'test.ts')).toContain('createPolymorphicComponent()')
  })
})

describe('renameInProject — ignores namespace imports', () => {
  it('does not touch import * as X', () => {
    const project = makeProject({
      'test.ts': [
        "import * as ReactKit from '@praxis-kit/react'",
        "const Button = ReactKit.createPolymorphicComponent({ tag: 'button' })",
      ].join('\n'),
    })

    renameInProject(project, renameOpts)

    const result = text(project, 'test.ts')
    expect(result).toContain('import * as ReactKit')
    expect(result).toContain('ReactKit.createPolymorphicComponent')
  })
})

describe('renameInProject — dry run', () => {
  it('does not modify files', () => {
    const source = [
      "import { createPolymorphicComponent } from '@praxis-kit/react'",
      "const Button = createPolymorphicComponent({ tag: 'button' })",
    ].join('\n')
    const project = makeProject({ 'test.ts': source })

    const result = renameInProject(project, { ...renameOpts, isDryRun: true })

    expect(text(project, 'test.ts')).toBe(source)
    // counts still reflect what would have changed
    expect(result.totalRenames).toBe(1)
    expect(result.filesModified).toBe(1)
  })
})

// ─── migratePathsInProject ────────────────────────────────────────────────────

describe('migratePathsInProject — ESM import', () => {
  it('rewrites the module specifier', () => {
    const project = makeProject({
      'test.ts': "import { createContractComponent } from '@praxis-kit/react'",
    })

    const result = migratePathsInProject(project, opts)

    expect(text(project, 'test.ts')).toMatchInlineSnapshot(
      `"import { createContractComponent } from 'praxis-kit/react'"`,
    )
    expect(result.totalRewrites).toBe(1)
    expect(result.filesModified).toBe(1)
  })
})

describe('migratePathsInProject — ESM re-export', () => {
  it('rewrites re-export specifiers', () => {
    const project = makeProject({
      'test.ts': "export { createContractComponent } from '@praxis-kit/react'",
    })

    migratePathsInProject(project, opts)

    expect(text(project, 'test.ts')).toContain("from 'praxis-kit/react'")
  })
})

describe('migratePathsInProject — dynamic import', () => {
  it('rewrites import() expressions', () => {
    const project = makeProject({
      'test.ts': "const mod = await import('@praxis-kit/react')",
    })

    migratePathsInProject(project, opts)

    expect(text(project, 'test.ts')).toContain("import('praxis-kit/react')")
  })
})

describe('migratePathsInProject — special case', () => {
  it('maps @praxis-kit/eslint-plugin → praxis-kit/eslint', () => {
    const project = makeProject({
      'test.ts': "import plugin from '@praxis-kit/eslint-plugin'",
    })

    migratePathsInProject(project, opts)

    expect(text(project, 'test.ts')).toContain("from 'praxis-kit/eslint'")
  })
})

describe('migratePathsInProject — CJS require', () => {
  it('rewrites require() string literals', () => {
    const project = makeProject({
      'test.js': "const react = require('@praxis-kit/react')",
    })

    migratePathsInProject(project, opts)

    expect(text(project, 'test.js')).toMatchInlineSnapshot(
      `"const react = require('praxis-kit/react')"`,
    )
  })
})

describe('migratePathsInProject — already migrated', () => {
  it('leaves praxis-kit/* specifiers untouched', () => {
    const project = makeProject({
      'test.ts': "import { x } from 'praxis-kit/react'",
    })

    const result = migratePathsInProject(project, opts)

    expect(text(project, 'test.ts')).toContain("from 'praxis-kit/react'")
    expect(text(project, 'test.ts')).not.toContain('@praxis-kit')
    expect(result.totalRewrites).toBe(0)
  })
})

describe('migratePathsInProject — dry run', () => {
  it('does not modify files', () => {
    const source = "import { x } from '@praxis-kit/react'"
    const project = makeProject({ 'test.ts': source })

    migratePathsInProject(project, { isDryRun: true, isVerbose: false })

    expect(text(project, 'test.ts')).toBe(source)
  })
})

// ─── Combined migration ───────────────────────────────────────────────────────

describe('combined migration (rename then paths)', () => {
  it('rewrites both the symbol name and the specifier', () => {
    const project = makeProject({
      'test.ts': [
        "import { createPolymorphicComponent } from '@praxis-kit/react'",
        "const Button = createPolymorphicComponent({ tag: 'button' })",
      ].join('\n'),
    })

    renameInProject(project, renameOpts)
    migratePathsInProject(project, opts)

    expect(text(project, 'test.ts')).toMatchInlineSnapshot(`
      "import { createContractComponent } from 'praxis-kit/react'
      const Button = createContractComponent({ tag: 'button' })"
    `)
  })

  it('handles aliased imports in the combined flow', () => {
    const project = makeProject({
      'test.ts': [
        "import { createPolymorphicComponent as poly } from '@praxis-kit/react'",
        "const Button = poly({ tag: 'button' })",
      ].join('\n'),
    })

    renameInProject(project, renameOpts)
    migratePathsInProject(project, opts)

    expect(text(project, 'test.ts')).toMatchInlineSnapshot(`
      "import { createContractComponent as poly } from 'praxis-kit/react'
      const Button = poly({ tag: 'button' })"
    `)
  })
})

// ─── Idempotency ─────────────────────────────────────────────────────────────

describe('idempotency', () => {
  it('produces the same output when run twice', () => {
    const project = makeProject({
      'test.ts': [
        "import { createPolymorphicComponent } from '@praxis-kit/react'",
        "const Button = createPolymorphicComponent({ tag: 'button' })",
      ].join('\n'),
    })

    renameInProject(project, renameOpts)
    migratePathsInProject(project, opts)
    const afterFirst = text(project, 'test.ts')

    renameInProject(project, renameOpts)
    migratePathsInProject(project, opts)
    const afterSecond = text(project, 'test.ts')

    expect(afterSecond).toBe(afterFirst)
  })

  it('reports zero changes on the second run', () => {
    const project = makeProject({
      'test.ts': [
        "import { createPolymorphicComponent } from '@praxis-kit/react'",
        "const Button = createPolymorphicComponent({ tag: 'button' })",
      ].join('\n'),
    })

    renameInProject(project, renameOpts)
    migratePathsInProject(project, opts)

    const r2 = renameInProject(project, renameOpts)
    const p2 = migratePathsInProject(project, opts)

    expect(r2.totalRenames).toBe(0)
    expect(p2.totalRewrites).toBe(0)
  })
})
