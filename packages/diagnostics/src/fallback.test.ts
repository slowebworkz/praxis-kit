import { describe, expect, it, vi } from 'vitest'
import {
  CollectingReporter,
  DefaultPolicy,
  Diagnostics,
  Severity,
  formatDiagnostic,
} from '@praxis-kit/diagnostics'
import { HtmlDiagnostics } from '@praxis-kit/contract'
import en from './en'
import { createMessageResolver } from './resolver'
import type { ResolverIssue } from './resolver'
import type { MessageCatalog, AnyRecord } from './types'

const fr: MessageCatalog = {
  contract: 1,
  locale: 'fr',
  messages: {
    HTML3003: { message: '<{tag}> a déjà le rôle implicite "{implicitRole}".' },
    // An entry with no rationale: the English one must NOT be spliced in.
    ARIA2007: { message: 'aria-relevant="all" doit être utilisé seul.' },
  },
}
const facts = (code: string, context: AnyRecord = {}) => ({ code, context })
const redundant = facts('HTML3003', { tag: 'nav', implicitRole: 'navigation' })

describe('fallback chain: requested catalog, then fallback, then the code', () => {
  it('uses the requested catalog first', () => {
    const resolve = createMessageResolver(fr, { fallback: en })
    expect(resolve(redundant)?.message).toBe('<nav> a déjà le rôle implicite "navigation".')
  })

  it('has no fallback by default: a missing entry resolves to nothing, never to English', () => {
    expect(createMessageResolver(fr)(facts('HTML3002', { tag: 'div' }))).toBeUndefined()
  })

  it('falls back to the opt-in catalog for an entry the requested one lacks', () => {
    const resolve = createMessageResolver(fr, { fallback: en })
    expect(resolve(facts('HTML3002', { tag: 'div' }))?.message).toContain('explicit empty role')
  })

  it('falls back per diagnostic, never per field', () => {
    const text = createMessageResolver(fr, { fallback: en })(facts('ARIA2007'))
    expect(text?.message).toBe('aria-relevant="all" doit être utilisé seul.')
    expect(text?.rationale).toBeUndefined()
    expect(text?.suggestions).toBeUndefined()
  })

  it('tries several fallbacks in order', () => {
    const second: MessageCatalog = {
      contract: 1,
      locale: 'es',
      messages: { HTML3002: { message: 'es {tag}' } },
    }
    const resolve = createMessageResolver(fr, { fallback: [second, en] })
    expect(resolve(facts('HTML3002', { tag: 'div' }))?.message).toBe('es div')
    expect(resolve(facts('HTML3005', { tag: 'main', implicitRole: 'main' }))?.message).toContain(
      'self-contained',
    )
  })

  it('resolves an unknown id to nothing even with a fallback, so the code is printed', () => {
    expect(createMessageResolver(fr, { fallback: en })(facts('ZZZ9999'))).toBeUndefined()
  })

  it('an incomplete catalog still works for the ids it has', () => {
    const resolve = createMessageResolver(
      { contract: 1, locale: 'fr', messages: {} },
      { fallback: en },
    )
    expect(resolve(redundant)?.message).toContain('already has implicit role')
  })

  it('ends at the printed code when nothing has an entry, and never throws', () => {
    const reporter = new CollectingReporter()
    const diagnostics = new Diagnostics(
      reporter,
      new DefaultPolicy({ reportThreshold: Severity.Warning }),
      {
        resolveMessage: createMessageResolver(fr),
      },
    )
    diagnostics.warn(HtmlDiagnostics.emptyRole('div'))
    const [reported] = reporter.diagnostics
    expect(reported?.message).toBeUndefined()
    expect(formatDiagnostic(reported!)).toBe('Warning HTML3002')
  })
})

describe('a catalog for a contract this version does not implement', () => {
  const issues = () => {
    const seen: ResolverIssue[] = []
    return { seen, onIssue: (i: ResolverIssue) => void seen.push(i) }
  }

  it('is ignored, reported through onIssue, and never throws', () => {
    const { seen, onIssue } = issues()
    const resolve = createMessageResolver({ ...fr, contract: 2 }, { onIssue })
    expect(resolve(redundant)).toBeUndefined()
    expect(seen).toEqual([expect.objectContaining({ kind: 'contract-incompatible', locale: 'fr' })])
  })

  it('lets the fallback answer instead', () => {
    const { seen, onIssue } = issues()
    const resolve = createMessageResolver({ ...fr, contract: 2 }, { fallback: en, onIssue })
    expect(resolve(redundant)?.message).toContain('already has implicit role')
    expect(seen).toHaveLength(1)
  })

  it('treats a missing contract as invalid and ignores the catalog', () => {
    const { seen, onIssue } = issues()
    const legacy = { locale: 'fr', messages: fr.messages } as unknown as MessageCatalog
    expect(createMessageResolver(legacy, { onIssue })(redundant)).toBeUndefined()
    expect(seen).toEqual([expect.objectContaining({ kind: 'invalid-contract' })])
  })

  it('ignores an incompatible fallback too', () => {
    const { seen, onIssue } = issues()
    const resolve = createMessageResolver(fr, { fallback: { ...en, contract: 9 }, onIssue })
    expect(resolve(facts('HTML3002', { tag: 'div' }))).toBeUndefined()
    expect(seen).toEqual([expect.objectContaining({ kind: 'contract-incompatible', locale: 'en' })])
  })

  it('still throws for a malformed locale, which is a startup mistake', () => {
    expect(() => createMessageResolver({ ...fr, locale: 'not a locale' })).toThrow(RangeError)
    expect(() => createMessageResolver(fr, { fallback: { ...en, locale: '' } })).toThrow(RangeError)
  })
})

describe('an entry that fails to render', () => {
  const broken = {
    contract: 1,
    locale: 'fr',
    messages: { HTML3003: { message: 42 } },
  } as unknown as MessageCatalog

  it('counts as missing: the fallback answers and the problem is reported', () => {
    const onIssue = vi.fn()
    const resolve = createMessageResolver(broken, { fallback: en, onIssue })
    expect(resolve(redundant)?.message).toContain('already has implicit role')
    expect(onIssue).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'render-failed', id: 'HTML3003', locale: 'fr' }),
    )
  })

  it('resolves to nothing, without throwing, when there is no fallback', () => {
    expect(createMessageResolver(broken)(redundant)).toBeUndefined()
  })

  it('is not taken down by an onIssue callback that throws', () => {
    const resolve = createMessageResolver(broken, {
      fallback: en,
      onIssue: () => {
        throw new Error('boom')
      },
    })
    expect(() => resolve(redundant)).not.toThrow()
    expect(resolve(redundant)?.message).toContain('already has implicit role')
  })
})
