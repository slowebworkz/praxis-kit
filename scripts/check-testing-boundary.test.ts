// Tests for check-testing-boundary.ts, run with Node's built-in runner (`pnpm test:scripts`).
//
// They protect the enforcement mechanism itself: a boundary check that silently stops catching
// violations (or starts flagging comments) is worse than none. The rule logic is pure, so these
// build workspaces and source files in memory.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findViolations, importSpecifiers, isTestSupportFile } from './check-testing-boundary.ts'
import type { SourceFile, WorkspacePackage } from './check-testing-boundary.ts'

const TESTING = '@praxis-kit/adapter-testing'

const pkg = (
  name: string,
  dir: string,
  fields: Record<string, unknown> = {},
): WorkspacePackage => ({
  name,
  dir,
  pkg: { name, ...fields },
})
const file = (path: string, text: string): SourceFile => ({ path, text })

// A small workspace: a testing package, a library, an adapter and the published package.
const workspace = (
  overrides: { guards?: Record<string, unknown>; kit?: Record<string, unknown> } = {},
) => [
  pkg(TESTING, 'testing/packages/adapter-testing'),
  pkg('@praxis-kit/guards', 'lib/guards', overrides.guards),
  pkg('@praxis-kit/react', 'adapters/react'),
  pkg('praxis-kit', 'packages/kit', overrides.kit),
]

describe('manifest rules', () => {
  it('allows a testing package in a production package devDependencies', () => {
    const packages = workspace({ guards: { devDependencies: { [TESTING]: 'workspace:*' } } })
    assert.deepEqual(findViolations(packages, []), [])
  })

  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    it(`flags a testing package under ${field}`, () => {
      const packages = workspace({ guards: { [field]: { [TESTING]: 'workspace:*' } } })
      assert.deepEqual(findViolations(packages, []), [
        `lib/guards/package.json: ${field} lists testing package ${TESTING}`,
      ])
    })
  }

  it('prohibits the published package from referencing a testing package at all', () => {
    const packages = workspace({ kit: { devDependencies: { [TESTING]: 'workspace:*' } } })
    const [violation, ...rest] = findViolations(packages, [])
    assert.equal(rest.length, 0)
    assert.match(violation as string, /packages\/kit\/package\.json: devDependencies lists/)
    assert.match(violation as string, /published package may not reference one/)
  })

  it('ignores unrelated dependencies', () => {
    const packages = workspace({ guards: { dependencies: { guardz: '1.0.0' } } })
    assert.deepEqual(findViolations(packages, []), [])
  })
})

describe('source rules', () => {
  const violations = (path: string, text: string) => findViolations(workspace(), [file(path, text)])

  it('flags a production import of a testing package by name', () => {
    assert.deepEqual(violations('lib/guards/src/a.ts', `import { x } from '${TESTING}'`), [
      `lib/guards/src/a.ts: production source imports "${TESTING}"`,
    ])
  })

  it('flags a subpath of a testing package', () => {
    assert.equal(violations('lib/guards/src/a.ts', `import x from '${TESTING}/helpers'`).length, 1)
  })

  it('does not flag a package that only shares the name as a prefix', () => {
    assert.deepEqual(violations('lib/guards/src/a.ts', `import x from '${TESTING}-extra'`), [])
  })

  it('flags a relative import that resolves into testing/packages', () => {
    const text = `import('../../../testing/packages/adapter-testing/src/index')`
    assert.equal(violations('lib/guards/src/a.ts', text).length, 1)
  })

  it('does not flag a relative path that only looks like testing/packages', () => {
    // From lib/guards/src, two levels up is lib/ -- so this is lib/testing/packages, not ours.
    const text = `import('../../testing/packages/adapter-testing/src/index')`
    assert.deepEqual(violations('lib/guards/src/a.ts', text), [])
  })

  it('exempts test and test-support files', () => {
    const text = `import { x } from '${TESTING}'`
    for (const path of [
      'adapters/react/src/a.test.ts',
      'adapters/react/src/a.spec.tsx',
      'adapters/react/src/a.pw.spec.tsx',
      'adapters/react/playwright-ct.config.ts',
      'adapters/react/vitest.config.ts',
      'adapters/react/src/shared/make-conformance-adapter.ts',
      'adapters/svelte/src/x.test-host.svelte',
    ]) {
      assert.deepEqual(violations(path, text), [], path)
    }
  })

  it('does not scan the testing packages themselves or files outside any production package', () => {
    const text = `import { x } from '${TESTING}'`
    assert.deepEqual(violations('testing/packages/adapter-testing/src/a.ts', text), [])
    assert.deepEqual(violations('scripts/some-script.ts', text), [])
  })

  it('still flags a non-test source file in an adapter', () => {
    assert.equal(violations('adapters/react/src/runtime.ts', `import '${TESTING}'`).length, 1)
  })
})

describe('import detection (a parser, not a regex)', () => {
  const specs = (text: string, path = 'a.ts') => importSpecifiers(path, text)

  it('ignores imports mentioned in comments and strings', () => {
    const text = [
      `// import { x } from '${TESTING}'`,
      `/* import y from '${TESTING}' */`,
      `/** @see import('${TESTING}') */`,
      `const a = "import z from '${TESTING}'"`,
      `const b = 'require("${TESTING}")'`,
      'const c = `import w from "' + TESTING + '"`',
      `export const note = 'from ' + '${TESTING}'`,
    ].join('\n')
    assert.deepEqual(specs(text), [])
  })

  it('finds every executable import form', () => {
    const text = [
      `import a from 'a'`,
      `import type { B } from 'b'`,
      `import 'c'`,
      `export { d } from 'd'`,
      `export * from 'e'`,
      `import f = require('f')`,
      `const g = await import('g')`,
      `const h = require('h')`,
      `type I = import('i').Thing`,
      `import { j as aliased } from 'j'`,
    ].join('\n')
    assert.deepEqual(specs(text), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])
  })

  it('parses TSX', () => {
    assert.deepEqual(specs(`import x from 'x'\nexport const e = <p>don't</p>`, 'a.tsx'), ['x'])
  })

  it('reads the script blocks of a Svelte or Vue file and not its markup', () => {
    const svelte = [
      `<script context="module">import a from 'a'</script>`,
      `<script lang="ts">import b from 'b'</script>`,
      `<p>import c from 'c'</p>`,
    ].join('\n')
    assert.deepEqual(specs(svelte, 'x.svelte'), ['a', 'b'])
    assert.deepEqual(specs(`<script setup>import v from 'v'</script>`, 'x.vue'), ['v'])
  })

  it('ignores non-literal dynamic imports and requires', () => {
    assert.deepEqual(specs(`import(name)\nrequire(name)\nimport(\`\${x}\`)`), [])
  })
})

describe('isTestSupportFile', () => {
  it('matches test and config files and nothing ordinary', () => {
    assert.equal(isTestSupportFile('lib/x/src/y.test.ts'), true)
    assert.equal(isTestSupportFile('adapters/vue/playwright-ct.config.ts'), true)
    assert.equal(isTestSupportFile('lib/x/src/testing-utils.ts'), false)
    assert.equal(isTestSupportFile('lib/x/src/contest.ts'), false)
  })
})
