import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import { buildSchema } from '../scripts/build-schema.mjs'
import contract from './contract-entry'
import en from './en'

// The tests build malformed catalogs on purpose, so the damage helpers take a loose shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>

const root = join(fileURLToPath(import.meta.url), '..', '..')
const committed = JSON.parse(readFileSync(join(root, 'schema', 'catalog.v1.schema.json'), 'utf8'))
const validate = new Ajv({ allErrors: true }).compile(committed)
const ok = (catalog: unknown) => validate(catalog) === true
const clone = () => structuredClone(en) as unknown as Loose

describe('catalog.v1.schema.json', () => {
  it('is generated from the contract and is not stale', () => {
    expect(committed).toEqual(buildSchema(contract))
  })

  it('offers every live message id as an editor suggestion', () => {
    const suggested = committed.properties.messages.propertyNames.examples as string[]
    expect([...suggested].sort()).toEqual(Object.keys(contract.ids).sort())
  })

  it('accepts the English catalog', () => {
    expect(ok(en)).toBe(true)
  })

  it('accepts a catalog with an id of its own (a custom rule)', () => {
    const c = clone()
    c.messages['acme.no-div-dialog'] = { message: '<{tag}> must not be a dialog.' }
    expect(ok(c)).toBe(true)
  })

  it('accepts builtAgainst and $comment', () => {
    expect(ok({ ...clone(), builtAgainst: '1.0', $comment: 'draft' })).toBe(true)
  })

  it.each([
    ['no contract', (c: Loose) => delete c.contract],
    ['another contract major', (c: Loose) => (c.contract = 2)],
    ['a string contract', (c: Loose) => (c.contract = '1')],
    ['no locale', (c: Loose) => delete c.locale],
    ['an empty locale', (c: Loose) => (c.locale = '')],
    ['no messages', (c: Loose) => delete c.messages],
    ['an extra top-level field', (c: Loose) => (c.extra = true)],
    ['a malformed builtAgainst', (c: Loose) => (c.builtAgainst = 'one')],
    ['a blank message', (c: Loose) => (c.messages.HTML3002.message = '   ')],
    ['a missing message', (c: Loose) => delete c.messages.HTML3002.message],
    [
      'a plural with no other form',
      (c: Loose) => (c.messages.SLOT1003.message = { plural: 'count', one: 'x' }),
    ],
    ['a plural with a blank form', (c: Loose) => (c.messages.SLOT1003.message.other = '')],
    ['an unknown plural category', (c: Loose) => (c.messages.SLOT1003.message.some = 'x')],
    ['an unknown entry field', (c: Loose) => (c.messages.HTML3002.extra = 'x')],
    [
      'a suggestion with no title',
      (c: Loose) => (c.messages.ARIA2003.suggestions[0] = { description: 'd' }),
    ],
    ['an unknown suggestion field', (c: Loose) => (c.messages.ARIA2003.suggestions[0].extra = 'x')],
    [
      'an id that does not look like one',
      (c: Loose) => (c.messages['9 bad id'] = { message: 'x' }),
    ],
  ])('rejects %s', (_name, damage) => {
    const c = clone()
    damage(c)
    expect(ok(c)).toBe(false)
  })
})

describe('schema assets follow the contract major', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const copy = readFileSync(join(root, 'scripts', 'copy-assets.mjs'), 'utf8')

  it('exports the current major as a versioned schema and as schema.json', () => {
    expect(pkg.exports[`./catalog.v${contract.contract}.schema.json`]).toBe(
      `./dist/catalog.v${contract.contract}.schema.json`,
    )
    expect(pkg.exports['./schema.json']).toBe('./dist/schema.json')
  })

  it('has a frozen schema file for every versioned export', () => {
    for (const key of Object.keys(pkg.exports)) {
      const match = /^\.\/catalog\.v(\d+)\.schema\.json$/.exec(key)
      if (match) {
        expect(existsSync(join(root, 'schema', `catalog.v${match[1]}.schema.json`))).toBe(true)
      }
    }
  })

  it('copies assets without hardcoding a major', () => {
    expect(copy).not.toMatch(/catalog\.v1/)
  })
})
