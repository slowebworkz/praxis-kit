import { describe, expect, it } from 'vitest'
import { checkCatalog, normalizeExtensions } from './check'
import contract from './contract-entry'
import type { DiagnosticsContract } from './contract'
import en from './en'
import type { AnyRecord } from './types'

// A fresh, mutable copy of the English catalog for each test to damage in one place. The entries are
// deliberately loose: the tests build malformed catalogs on purpose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>
const copy = () =>
  structuredClone(en) as unknown as { contract: unknown; locale: unknown; messages: Loose }
const kinds = (r: ReturnType<typeof checkCatalog>) => r.errors.map((e) => e.kind)

describe('checkCatalog — the English catalog', () => {
  it('is valid and complete against the contract', () => {
    const r = checkCatalog(en, contract)
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
    expect(r.incomplete).toEqual([])
    expect(r.obsolete).toEqual([])
    expect(r.coverage).toEqual({
      translated: 54,
      total: 54,
      ratio: 1,
      notCatalogDriven: expect.any(Number),
    })
    expect(r.contract).toEqual({ required: 1, catalog: 1, compatible: true, runtime: '1.0' })
  })
})

describe('checkCatalog — structure never throws', () => {
  it.each([42, null, undefined, 'text', [], true])('reports %j instead of throwing', (value) => {
    const r = checkCatalog(value, contract)
    expect(kinds(r)).toEqual(['invalid-structure'])
  })

  it('rejects a missing or malformed contract version', () => {
    for (const bad of [undefined, 0, -1, 1.5, '1', null]) {
      const c = { ...copy(), contract: bad }
      expect(kinds(checkCatalog(c, contract))).toEqual(['invalid-contract'])
    }
  })

  it('rejects a catalog for another contract major and checks nothing else', () => {
    const c = copy()
    c.contract = 2
    c.messages['NOPE'] = { message: 'x' }
    const r = checkCatalog(c, contract)
    expect(kinds(r)).toEqual(['contract-incompatible'])
    expect(r.contract.compatible).toBe(false)
  })

  it('reports an invalid locale and a bad messages object', () => {
    expect(kinds(checkCatalog({ ...copy(), locale: 'en_US' }, contract))).toContain(
      'invalid-locale',
    )
    expect(kinds(checkCatalog({ contract: 1, locale: 'en', messages: [] }, contract))).toContain(
      'invalid-structure',
    )
  })

  it('reports a malformed entry', () => {
    const c = copy()
    c.messages['HTML3002'] = 'just a string'
    expect(checkCatalog(c, contract).errors).toContainEqual(
      expect.objectContaining({ kind: 'invalid-structure', id: 'HTML3002' }),
    )
  })
})

describe('checkCatalog — ids', () => {
  it('reports a typo id as an unknown id', () => {
    const c = copy()
    c.messages['HTML3042'] = { message: 'x' }
    expect(checkCatalog(c, contract).errors).toContainEqual(
      expect.objectContaining({ kind: 'unknown-id', id: 'HTML3042' }),
    )
  })

  it.each(['constructor', 'toString', '__proto__'])(
    'does not treat inherited %s as an id',
    (name) => {
      const c = copy()
      Object.defineProperty(c.messages, name, { value: { message: 'x' }, enumerable: true })
      expect(kinds(checkCatalog(c, contract))).toContain('unknown-id')
    },
  )

  it('reports a missing id as incomplete, not as an error', () => {
    const c = copy()
    delete c.messages['HTML3002']
    const r = checkCatalog(c, contract)
    expect(r.errors).toEqual([])
    expect(r.incomplete).toContainEqual({ id: 'HTML3002', since: '1.0', missing: ['message'] })
    expect(r.coverage.translated).toBe(53)
    expect(r.coverage.ratio).toBeCloseTo(53 / 54)
  })

  it('reports a missing rationale and missing suggestions as incomplete', () => {
    const c = copy()
    delete c.messages['ARIA2003'].rationale
    c.messages['ARIA2009'].suggestions = c.messages['ARIA2009'].suggestions.slice(0, 1)
    const r = checkCatalog(c, contract)
    expect(r.errors).toEqual([])
    expect(r.incomplete).toContainEqual({ id: 'ARIA2003', since: '1.0', missing: ['rationale'] })
    expect(r.incomplete).toContainEqual({ id: 'ARIA2009', since: '1.0', missing: ['suggestions'] })
  })
})

describe('checkCatalog — placeholders', () => {
  it('rejects a placeholder that is not a context key of the id', () => {
    const c = copy()
    c.messages['HTML3003'].message += ' {bogus}'
    expect(checkCatalog(c, contract).errors).toContainEqual(
      expect.objectContaining({ kind: 'unknown-context-key', id: 'HTML3003', field: 'message' }),
    )
  })

  it('rejects a message that drops an essential key', () => {
    const c = copy()
    c.messages['HTML3003'].message = 'Rôle redondant.'
    expect(checkCatalog(c, contract).errors).toContainEqual(
      expect.objectContaining({ kind: 'placeholder-missing-essential', id: 'HTML3003' }),
    )
  })

  it('only warns about a non-essential key left out of the whole entry', () => {
    const c = copy()
    c.messages['COMP1004'].message = '{scope}: enfant inattendu "{typeName}".'
    const r = checkCatalog(c, contract)
    expect(r.errors).toEqual([])
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ kind: 'placeholder-omitted', id: 'COMP1004' }),
    )
  })

  it('does not warn about an informational key', () => {
    expect(checkCatalog(en, contract).warnings).toEqual([])
  })

  it('rejects an unknown filter and a filter that does not fit the key kind', () => {
    const c = copy()
    c.messages['HTML3003'].message = '<{tag|upper}> a le rôle {implicitRole}.'
    expect(kinds(checkCatalog(c, contract))).toContain('unknown-filter')
    const d = copy()
    d.messages['HTML3003'].message = '<{tag|list}> a le rôle {implicitRole}.'
    expect(kinds(checkCatalog(d, contract))).toContain('filter-kind-mismatch')
    const e = copy()
    e.messages['COMP1004'].message = '{scope}: enfant "{typeName}" à l\'index {index|quote}.'
    expect(kinds(checkCatalog(e, contract))).toContain('filter-kind-mismatch')
  })

  it('rejects a blank message', () => {
    const c = copy()
    c.messages['HTML3002'].message = '   '
    expect(checkCatalog(c, contract).errors).toContainEqual(
      expect.objectContaining({ kind: 'empty-message', id: 'HTML3002', field: 'message' }),
    )
  })

  it('reports an unknown field on an entry and on a suggestion', () => {
    const c = copy()
    c.messages['HTML3002'].extra = 'x'
    c.messages['ARIA2003'].suggestions[0].extra = 'x'
    expect(checkCatalog(c, contract).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'unknown-field', id: 'HTML3002', field: 'extra' }),
        expect.objectContaining({
          kind: 'unknown-field',
          id: 'ARIA2003',
          field: 'suggestions.0.extra',
        }),
      ]),
    )
  })

  it('reports more suggestions than the contract has', () => {
    const c = copy()
    c.messages['HTML3002'].suggestions = [{ title: 't' }]
    expect(checkCatalog(c, contract).errors).toContainEqual(
      expect.objectContaining({ kind: 'unknown-field', id: 'HTML3002', field: 'suggestions.0' }),
    )
  })
})

describe('checkCatalog — plurals', () => {
  const plural = (forms: AnyRecord, locale = 'en') => {
    const c = copy()
    c.locale = locale
    c.messages['SLOT1003'].message = forms
    return checkCatalog(c, contract)
  }

  it('catches a plural form that drops the essential count', () => {
    const r = plural({
      plural: 'count',
      one: '{name}: {count} enfant',
      other: '{name}: des enfants {elementTerm}',
    })
    expect(r.errors).toContainEqual(
      expect.objectContaining({
        kind: 'placeholder-missing-essential',
        id: 'SLOT1003',
        form: 'other',
      }),
    )
  })

  it('requires the selector the contract names', () => {
    const r = plural({
      plural: 'name',
      one: '{name} {count} {elementTerm}',
      other: '{name} {count} {elementTerm}',
    })
    expect(kinds(r)).toContain('plural-selector-mismatch')
  })

  it('requires an other form', () => {
    const r = plural({ plural: 'count', one: '{name} {count} {elementTerm}' })
    expect(kinds(r)).toContain('missing-other-form')
  })

  it('rejects a form the locale never selects, and accepts one it does', () => {
    const forms = {
      plural: 'count',
      one: '{name} {count} {elementTerm}',
      few: '{name} {count} {elementTerm}',
      other: '{name} {count} {elementTerm}',
    }
    expect(plural(forms, 'en').errors).toContainEqual(
      expect.objectContaining({ kind: 'invalid-plural-form', form: 'few' }),
    )
    expect(plural(forms, 'ru').errors.filter((e) => e.kind === 'invalid-plural-form')).toEqual([])
  })

  it('rejects a form that is not a plural category at all', () => {
    expect(
      kinds(
        plural({
          plural: 'count',
          many2: 'x {name} {count} {elementTerm}',
          other: '{name} {count} {elementTerm}',
        }),
      ),
    ).toContain('invalid-plural-form')
  })

  it('lets a language without plurals use a plain string that keeps the count', () => {
    const c = copy()
    c.locale = 'ja'
    c.messages['SLOT1003'].message = '{name}: {count} {elementTerm}'
    expect(checkCatalog(c, contract).errors).toEqual([])
  })
})

describe('checkCatalog — contract evolution', () => {
  // A small synthetic contract, so each lifecycle state can be shown without touching the real one.
  const spec = (over: AnyRecord = {}) => ({
    codes: ['X1'],
    category: 'ARIA',
    description: 'd',
    rationale: false,
    suggestions: 0,
    since: '1.0',
    examples: [],
    context: { tag: { kind: 'identifier', required: true, essential: true, description: 't' } },
    ...over,
  })
  const base = (ids: AnyRecord) =>
    ({
      contract: 1,
      minor: 3,
      kinds: {},
      ids,
      notCatalogDriven: {},
    }) as unknown as DiagnosticsContract
  const pack = (messages: AnyRecord) => ({ contract: 1, locale: 'fr', messages })

  it('a compatible addition is incomplete, not an error, and carries its version', () => {
    const c = base({ A: spec(), B: spec({ since: '1.3' }) })
    const r = checkCatalog(pack({ A: { message: '{tag}' } }), c)
    expect(r.errors).toEqual([])
    expect(r.incomplete).toEqual([{ id: 'B', since: '1.3', missing: ['message'] }])
  })

  it('a deprecated id still renders and is reported in its own bucket', () => {
    const c = base({
      A: spec({ deprecated: { since: '1.2', replacedBy: 'B' } }),
      B: spec({ since: '1.2' }),
    })
    const r = checkCatalog(pack({ A: { message: '{tag}' }, B: { message: '{tag}' } }), c)
    expect(r.errors).toEqual([])
    expect(r.deprecated).toEqual([{ id: 'A', since: '1.2', replacedBy: 'B' }])
  })

  it('a translation of a removed id is obsolete (with its replacement), not unknown, and not counted', () => {
    const c = base({ A: spec({ removedIn: '1.3', replacedBy: 'B' }), B: spec({ since: '1.3' }) })
    const r = checkCatalog(pack({ A: { message: '{tag}' }, B: { message: '{tag}' } }), c)
    expect(r.errors).toEqual([])
    expect(r.obsolete).toEqual([{ id: 'A', removedIn: '1.3', replacedBy: 'B' }])
    expect(r.coverage).toEqual({
      translated: 1,
      total: 1,
      ratio: 1,
      notCatalogDriven: expect.any(Number),
    })
  })

  it('an empty contract has full coverage by definition', () => {
    expect(checkCatalog(pack({}), base({})).coverage.ratio).toBe(1)
  })
})

describe('custom ids (extension contract)', () => {
  const extension = {
    ids: {
      'acme.no-div-dialog': {
        context: {
          tag: { kind: 'identifier', required: true, essential: true, description: 'tag' },
        },
      },
    },
  } as const
  const withCustom = (message: string) => ({
    ...en,
    messages: { ...en.messages, 'acme.no-div-dialog': { message } },
  })

  it('rejects a namespaced id without an extension, and says how to declare it', () => {
    const r = checkCatalog(withCustom('<{tag}> no'), contract)
    expect(r.errors).toEqual([
      expect.objectContaining({ kind: 'unknown-id', id: 'acme.no-div-dialog' }),
    ])
    expect(r.errors[0]?.message).toContain('--extension')
  })

  it('accepts it when declared, without counting it toward coverage', () => {
    const r = checkCatalog(withCustom('<{tag}> no'), contract, { extensions: extension })
    expect(r.errors).toEqual([])
    expect(r.coverage.total).toBe(54)
  })

  it('validates the extension id like any other: placeholders must be in its context', () => {
    const r = checkCatalog(withCustom('<{nope}> no'), contract, { extensions: extension })
    expect(r.errors.map((e) => e.kind)).toContain('unknown-context-key')
    expect(r.errors.map((e) => e.kind)).toContain('placeholder-missing-essential')
  })

  it.each([
    [{ ids: { NoNamespace: {} } }],
    [{ ids: { 'HTML3003.x': {} } }],
    [{ ids: { HTML3003: {} } }],
    [{ ids: { 'acme.x': { context: { a: { kind: 'bogus', required: true } } } } }],
    [{}],
    [{ ids: {}, extra: 1 }],
    [{ ids: { 'acme.x': { suggestions: 'one' } } }],
    [{ ids: { 'acme.x': { suggestions: -1 } } }],
    [{ ids: { 'acme.x': { suggestions: 1.5 } } }],
    [{ ids: { 'acme.x': { rationale: 'yes' } } }],
    [{ ids: { 'acme.x': { context: [] } } }],
    [{ ids: { 'acme.x': { context: { a: 'identifier' } } } }],
    [{ ids: { 'acme.x': { context: { a: { kind: 'identifier' } } } } }],
    [{ ids: { 'acme.x': { context: { a: { kind: 'identifier', required: true, nope: 1 } } } } }],
    [
      {
        ids: {
          'acme.x': { context: { a: { kind: 'identifier', required: true, essential: 'y' } } },
        },
      },
    ],
    [
      {
        ids: {
          'acme.x': { context: { a: { kind: 'identifier', required: true, description: 3 } } },
        },
      },
    ],
    [{ ids: { 'acme.x': { plural: 3 } } }],
    [{ ids: { 'acme.x': { plural: 'n' } } }],
    [
      {
        ids: { 'acme.x': { context: { n: { kind: 'identifier', required: true } }, plural: 'n' } },
      },
    ],
    [{ ids: { 'acme.x': { colour: 'red' } } }],
    [
      {
        ids: {
          'acme.x': { context: { a: { kind: 'identifier', required: false, essential: true } } },
        },
      },
    ],
    [{ ids: { 'acme.Rule': {} } }],
    [{ ids: { 'Acme.rule': {} } }],
    [{ ids: { 'acme.no_div': {} } }],
  ])('rejects the invalid extension %j', (bad) => {
    expect(() => checkCatalog(en, contract, { extensions: bad as never })).toThrow(RangeError)
  })
})

describe('a complete extension', () => {
  it('normalizes every declared property', () => {
    const out = normalizeExtensions(
      {
        $comment: 'x',
        ids: {
          'acme.count': {
            $comment: 'n',
            context: {
              n: { kind: 'number', required: true, essential: true, description: 'how many' },
            },
            plural: 'n',
            rationale: true,
            suggestions: 2,
          },
        },
      },
      contract,
    )
    expect(out['acme.count']).toMatchObject({ plural: 'n', rationale: true, suggestions: 2 })
    expect(out['acme.count']?.context?.['n']).toEqual({
      kind: 'number',
      required: true,
      essential: true,
      description: 'how many',
    })
  })
})

describe('top-level shape (same as the JSON Schema)', () => {
  it('rejects an unknown top-level field', () => {
    const r = checkCatalog({ ...en, extra: 1 }, contract)
    expect(r.errors).toEqual([expect.objectContaining({ kind: 'unknown-field', field: 'extra' })])
  })

  it('rejects a malformed builtAgainst or a non-string $comment', () => {
    expect(checkCatalog({ ...en, builtAgainst: '1' }, contract).errors).toHaveLength(1)
    expect(checkCatalog({ ...en, $comment: 3 }, contract).errors).toHaveLength(1)
    expect(checkCatalog({ ...en, builtAgainst: '1.3' }, contract).errors).toEqual([])
  })

  it('does not coerce a numeric builtAgainst: 1.3 is a number, not the string "1.3"', () => {
    const r = checkCatalog({ ...en, builtAgainst: 1.3 }, contract)
    expect(r.errors).toEqual([
      expect.objectContaining({ kind: 'invalid-structure', field: 'builtAgainst' }),
    ])
  })
})
