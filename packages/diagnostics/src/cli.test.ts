import { describe, expect, it } from 'vitest'
import { buildSourceSheet, EXIT, run } from './cli'
import type { Io } from './cli'
import contractData from './contract-entry'
import en from './en'

function drive(argv: string[], files: Record<string, string> = {}) {
  let stdout = ''
  let stderr = ''
  const io: Io = {
    stdout: (t) => void (stdout += t),
    stderr: (t) => void (stderr += t),
    readFile: (path) => {
      if (!Object.hasOwn(files, path)) throw new Error(`ENOENT ${path}`)
      return files[path] as string
    },
  }
  const code = run(argv, io)
  return { code, stdout, stderr }
}

const english = JSON.stringify(en)
const partial = JSON.stringify({
  contract: 1,
  locale: 'fr',
  messages: { HTML3003: { message: '<{tag}> a déjà le rôle "{implicitRole}".' } },
})

describe('validate', () => {
  it('exits 0 for a valid catalog', () => {
    const r = drive(['validate', 'en.json'], { 'en.json': english })
    expect(r.code).toBe(EXIT.ok)
    expect(r.stdout).toContain('Structurally valid.')
  })

  it('prints the report as JSON', () => {
    const r = drive(['validate', 'en.json', '--json'], { 'en.json': english })
    const report = JSON.parse(r.stdout)
    expect(report.errors).toEqual([])
    expect(report.coverage.ratio).toBe(1)
  })

  it('exits 1 for structural errors', () => {
    const bad = JSON.stringify({ contract: 1, locale: 'fr', messages: { NOPE: { message: 'x' } } })
    const r = drive(['validate', 'fr.json'], { 'fr.json': bad })
    expect(r.code).toBe(EXIT.invalid)
    expect(r.stdout).toContain('unknown-id')
  })

  it('exits 1 for a catalog that is not JSON', () => {
    expect(drive(['validate', 'x.json'], { 'x.json': '{' }).code).toBe(EXIT.invalid)
    expect(drive(['validate', 'missing.json']).code).toBe(EXIT.invalid)
  })

  it('keeps completeness apart from validity, and gates it with --min-coverage', () => {
    const files = { 'fr.json': partial }
    expect(drive(['validate', 'fr.json'], files).code).toBe(EXIT.ok)
    expect(drive(['validate', 'fr.json', '--min-coverage', '50'], files).code).toBe(
      EXIT.lowCoverage,
    )
    expect(drive(['validate', 'fr.json', '--min-coverage=1'], files).code).toBe(EXIT.ok)
  })

  it('validates against another contract file with --contract', () => {
    const custom = JSON.stringify({ ...contractData, ids: {} })
    const r = drive(['validate', 'fr.json', '--contract', 'c.json'], {
      'fr.json': partial,
      'c.json': custom,
    })
    expect(r.code).toBe(EXIT.invalid)
    expect(r.stdout).toContain('unknown-id')
  })

  it('reports an unreadable contract as a usage problem', () => {
    expect(
      drive(['validate', 'fr.json', '--contract', 'nope.json'], { 'fr.json': partial }).code,
    ).toBe(EXIT.usage)
  })

  it('exits 1 on an unsupported contract major', () => {
    const r = drive(['validate', 'x.json'], {
      'x.json': JSON.stringify({ contract: 2, locale: 'fr', messages: {} }),
    })
    expect(r.code).toBe(EXIT.invalid)
  })
})

describe('usage', () => {
  it.each([
    [[]],
    [['validate']],
    [['bogus']],
    [['validate', 'a.json', '--wat']],
    [['validate', 'a.json', '--min-coverage']],
    [['validate', 'a.json', '--min-coverage', '200']],
    [['export-source', '--format', 'xml']],
  ])('exits 64 for %j', (argv) => {
    expect(drive(argv, { 'a.json': english }).code).toBe(EXIT.usage)
  })

  it('--help exits 0', () => {
    const r = drive(['--help'])
    expect(r.code).toBe(EXIT.ok)
    expect(r.stdout).toContain('validate')
  })
})

describe('export-source', () => {
  it('lists every live id with its English source and rendered examples', () => {
    const sheet = JSON.parse(drive(['export-source']).stdout)
    expect(sheet.ids.length).toBe(Object.keys(en.messages).length)
    const nav = sheet.ids.find((i: { id: string }) => i.id === 'HTML3003')
    expect(nav.english.message).toContain('implicit role')
    expect(nav.examples[0].english.message).toBeTruthy()
  })

  it('renders Markdown', () => {
    const r = drive(['export-source', '--format', 'md'])
    expect(r.code).toBe(EXIT.ok)
    expect(r.stdout).toContain('## HTML3003')
  })

  it('omits removed ids', () => {
    const sheet = buildSourceSheet({
      ...contractData,
      ids: {
        ...contractData.ids,
        OLD: { ...Object.values(contractData.ids)[0]!, removedIn: '1.1' },
      },
    })
    expect(sheet.ids.some((i) => i.id === 'OLD')).toBe(false)
  })
})
