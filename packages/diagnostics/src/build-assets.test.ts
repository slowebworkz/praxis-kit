import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import contract from './contract-entry'

// Runs the real asset-copy step into a temp directory and reads what it emitted, so a copy step that
// fails at runtime (a wrong path, a missing major) fails here even when the static checks pass.
const root = join(fileURLToPath(import.meta.url), '..', '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  exports: Record<string, string | { import?: string }>
}
let out: string
const read = (file: string) => JSON.parse(readFileSync(join(out, file), 'utf8'))

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), 'praxis-diagnostics-assets-'))
  execFileSync('node', [join(root, 'scripts', 'copy-assets.mjs'), '--out', out], { stdio: 'pipe' })
})
afterAll(() => rmSync(out, { recursive: true, force: true }))

describe('copy-assets output', () => {
  it('emits the versioned schema for the current contract major', () => {
    expect(existsSync(join(out, `catalog.v${contract.contract}.schema.json`))).toBe(true)
  })

  it('emits schema.json as the current major, identical to the versioned file', () => {
    expect(read('schema.json')).toEqual(read(`catalog.v${contract.contract}.schema.json`))
    expect(read('schema.json').properties.contract.const).toBe(contract.contract)
  })

  it('emits the contract and the English catalog unchanged', () => {
    expect(read('diagnostics.contract.json')).toEqual(contract)
    expect(read('en.json').contract).toBe(contract.contract)
  })

  it('emits every JSON file the package exports', () => {
    for (const [key, target] of Object.entries(pkg.exports)) {
      if (typeof target === 'string' && target.startsWith('./dist/') && target.endsWith('.json')) {
        expect(existsSync(join(out, target.slice('./dist/'.length))), `${key} -> ${target}`).toBe(
          true,
        )
      }
    }
  })
})
