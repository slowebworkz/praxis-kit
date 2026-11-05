import { describe, expect, it } from 'vitest'
import { DiagnosticCode } from '@praxis-kit/diagnostics'
import baselineJson from '../contract/contract.baseline.json'
import contract from './contract-entry'
import { CONTRACT_VERSION } from './contract'
import en from './en'
import { SAMPLES } from './fixtures/samples'

// The contract is the thing a translation is written against. These tests keep it honest: tied to
// the factories that emit diagnostics, to the full list of diagnostic codes, to the English catalog,
// and to the last published contract. A diagnostic change that would silently invalidate a
// translation fails here first.

interface Baseline {
  contract: number
  minor: number
  ids: Record<
    string,
    { since: string; context: Record<string, { kind: string; required: boolean }> }
  >
}
const baseline = baselineJson as Baseline

const ids = Object.entries(contract.ids)
const factFor = (make: () => unknown) =>
  make() as { code: string; messageId?: string; context?: Record<string, unknown> }

describe('contract version', () => {
  it('matches the constant the resolver checks', () => {
    expect(CONTRACT_VERSION).toEqual({ major: contract.contract, minor: contract.minor })
  })
})

describe('contract and the diagnostic codes', () => {
  const served = new Set(ids.flatMap(([, spec]) => spec.codes))
  const pending = Object.keys(contract.notCatalogDriven)

  it('accounts for every DiagnosticCode exactly once', () => {
    const all = Object.values(DiagnosticCode) as string[]
    expect([...served, ...pending].sort()).toEqual([...all].sort())
    expect(pending.filter((code) => served.has(code))).toEqual([])
  })

  it('gives every code a reason when it is not catalog-driven', () => {
    for (const [code, reason] of Object.entries(contract.notCatalogDriven)) {
      expect([code, reason.length > 10]).toEqual([code, true])
    }
  })
})

describe('contract and the English catalog', () => {
  it('describes exactly the ids English translates', () => {
    expect(Object.keys(en.messages).sort()).toEqual(Object.keys(contract.ids).sort())
  })

  it('records which fields English has, so completeness can be measured', () => {
    for (const [id, spec] of ids) {
      const entry = en.messages[id]!
      expect([id, spec.rationale]).toEqual([id, entry.rationale !== undefined])
      expect([id, spec.suggestions]).toEqual([id, entry.suggestions?.length ?? 0])
    }
  })
})

describe('contract and the factories (the anti-drift guard)', () => {
  const emitted = Object.entries(SAMPLES).map(([key, make]) => ({ key, ...factFor(make) }))

  it('has an example for every fact the factories emit, and no example they do not', () => {
    const fromFactories = emitted.map(({ code, messageId, context }) =>
      JSON.stringify({ code, messageId, context }),
    )
    const fromContract = ids.flatMap(([, spec]) =>
      spec.examples.map(({ code, messageId, context }) =>
        JSON.stringify({ code, messageId, context }),
      ),
    )
    expect([...new Set(fromContract)].sort()).toEqual([...new Set(fromFactories)].sort())
  })

  it.each(emitted.map((e) => [e.key, e] as const))(
    '%s: emits only documented context, all of it required, of the documented kind',
    (_key, fact) => {
      const id = fact.messageId ?? fact.code
      const spec = contract.ids[id]
      expect(spec, `no contract entry for ${id}`).toBeDefined()
      expect(spec!.codes).toContain(fact.code)
      const documented = spec!.context ?? {}
      const context = fact.context ?? {}
      expect(Object.keys(context).filter((k) => !(k in documented))).toEqual([])
      expect(
        Object.keys(documented).filter((k) => documented[k]!.required && !(k in context)),
      ).toEqual([])
      for (const [name, value] of Object.entries(context)) {
        const kind = documented[name]!.kind
        const ok =
          kind === 'number'
            ? typeof value === 'number'
            : kind === 'string[]'
              ? Array.isArray(value) && value.every((x) => typeof x === 'string')
              : typeof value === 'string'
        expect([name, kind, ok]).toEqual([name, kind, true])
      }
    },
  )
})

describe('contract hygiene', () => {
  it.each(ids)('%s is well formed', (id, spec) => {
    expect(spec.codes.length).toBeGreaterThan(0)
    expect(spec.description.length).toBeGreaterThan(10)
    expect(spec.examples.length).toBeGreaterThan(0)
    expect(spec.since).toMatch(/^[0-9]+\.[0-9]+$/)
    const [major, minor] = spec.since.split('.').map(Number) as [number, number]
    expect(
      major < contract.contract || (major === contract.contract && minor <= contract.minor),
    ).toBe(true)
    if (spec.plural !== undefined) expect(spec.context?.[spec.plural]?.kind).toBe('number')
    if (spec.removedIn !== undefined) expect(spec.replacedBy ?? spec.description).toBeTruthy()
    for (const [name, key] of Object.entries(spec.context ?? {})) {
      expect([id, name, key.description.length > 5]).toEqual([id, name, true])
    }
  })

  it('has no prose in context: contract 1 defines no text keys', () => {
    for (const [, spec] of ids) {
      for (const key of Object.values(spec.context ?? {})) expect(key.kind).not.toBe('text')
    }
  })
})

// A change to the contract is only valid with the right version bump. This compares the contract with
// `contract.baseline.json` (the last published contract) and says what must change.
describe('versioning against the last published contract', () => {
  const current = contract
  const bumpedMajor = current.contract > baseline.contract
  const bumpedMinor = current.contract === baseline.contract && current.minor > baseline.minor
  const breaking: string[] = []
  const additive: string[] = []

  for (const [id, old] of Object.entries(baseline.ids)) {
    const now = current.ids[id]
    if (now === undefined) {
      breaking.push(`${id} was removed without a tombstone (keep it with removedIn and replacedBy)`)
      continue
    }
    for (const [key, was] of Object.entries(old.context)) {
      const is = now.context?.[key]
      if (is === undefined) breaking.push(`${id}.${key} was removed`)
      else if (is.kind !== was.kind)
        breaking.push(`${id}.${key} changed kind from ${was.kind} to ${is.kind}`)
    }
    for (const [key, is] of Object.entries(now.context ?? {})) {
      if (!(key in old.context)) additive.push(`${id}.${key} was added`)
      else if (is.required && !old.context[key]!.required)
        breaking.push(`${id}.${key} became required`)
    }
  }
  for (const id of Object.keys(current.ids)) {
    if (!(id in baseline.ids)) additive.push(`${id} was added`)
  }

  it('bumps the contract major for a breaking change', () => {
    expect(bumpedMajor || breaking.length === 0, `breaking: ${breaking.join('; ')}`).toBe(true)
  })

  it('bumps the minor for a compatible addition', () => {
    const bumped = bumpedMajor || bumpedMinor
    expect(
      bumped || additive.length === 0,
      `added without a minor bump: ${additive.join('; ')}`,
    ).toBe(true)
  })

  it('does not move backwards', () => {
    expect(current.contract >= baseline.contract).toBe(true)
    if (current.contract === baseline.contract) expect(current.minor >= baseline.minor).toBe(true)
  })
})
