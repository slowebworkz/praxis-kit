import { describe, expect, it } from 'vitest'
import {
  Diagnostics,
  CollectingReporter,
  DiagnosticCategory,
  DiagnosticCode,
  createDiagnostics,
} from '@praxis-kit/diagnostics'
import { HtmlDiagnostics } from '@praxis-kit/contract'
import en from './en'
import { assertValidLocale, createMessageResolver } from './resolver'
import type { MessageCatalog } from './types'

const de: MessageCatalog = {
  locale: 'de',
  messages: {
    HTML3003: { message: '<{tag}> hat bereits die implizite Rolle "{implicitRole}".' },
  },
}

describe('createMessageResolver', () => {
  it('resolves a fact from its code and context', () => {
    const resolve = createMessageResolver(en)
    expect(
      resolve({ code: 'HTML3003', context: { tag: 'nav', implicitRole: 'navigation' } })?.message,
    ).toBe('<nav> already has implicit role="navigation". Avoid redundant role assignment.')
  })

  it('prefers the message id over the code', () => {
    const resolve = createMessageResolver(en)
    const text = resolve({
      code: 'HTML3103',
      messageId: 'HTML31xx.attributeIgnored',
      context: { attribute: 'checked', type: 'text', allowedTypes: ['checkbox'] },
    })
    expect(text?.message).toBe('"checked" is ignored on <input type="text">.')
  })

  it('returns undefined — not English — when the catalog has no entry', () => {
    expect(createMessageResolver(de)({ code: 'HTML3004', context: { tag: 'nav' } })).toBeUndefined()
  })

  it.each(['constructor', 'toString', 'hasOwnProperty', '__proto__', 'valueOf'])(
    'does not resolve the inherited member %s as a catalog entry',
    (id) => {
      const resolve = createMessageResolver(en)
      expect(resolve({ code: 'ARIA2002', messageId: id, context: {} })).toBeUndefined()
    },
  )

  it('still resolves a catalog entry whose own key shadows an inherited name', () => {
    const catalog: MessageCatalog = { locale: 'en', messages: { constructor: { message: 'mine' } } }
    expect(createMessageResolver(catalog)({ code: 'X', messageId: 'constructor' })?.message).toBe(
      'mine',
    )
  })

  it('rejects a malformed locale when the resolver is created, not while rendering', () => {
    expect(() => createMessageResolver({ locale: 'not_a_locale!', messages: {} })).toThrow(
      RangeError,
    )
    expect(() => assertValidLocale('pt-BR')).not.toThrow()
    expect(() => assertValidLocale('')).toThrow(/Invalid locale/)
  })
})

describe('end to end with Diagnostics', () => {
  const fact = HtmlDiagnostics.implicitRoleRedundant('nav', 'navigation')

  it('a plain instance reports the code and no text', () => {
    const reporter = new CollectingReporter()
    new Diagnostics(reporter).warn(fact)
    expect(reporter.diagnostics[0]?.code).toBe(DiagnosticCode.HtmlImplicitRoleRedundant)
    expect(reporter.diagnostics[0]?.message).toBeUndefined()
    expect(reporter.diagnostics[0]?.category).toBe(DiagnosticCategory.HTML)
  })

  it('two instances report in different languages at the same time', () => {
    const a = new CollectingReporter()
    const b = new CollectingReporter()
    new Diagnostics(a, undefined, { resolveMessage: createMessageResolver(en) }).warn(fact)
    new Diagnostics(b, undefined, { resolveMessage: createMessageResolver(de) }).warn(fact)
    expect(a.diagnostics[0]?.message).toContain('already has implicit role')
    expect(b.diagnostics[0]?.message).toBe('<nav> hat bereits die implizite Rolle "navigation".')
  })

  it('createDiagnostics wires a resolver into a preset without touching the preset', () => {
    const localized = createDiagnostics('silent', { messages: createMessageResolver(en) })
    expect(localized.resolveMessage).toBeDefined()
    expect(createDiagnostics('silent').resolveMessage).toBeUndefined()
  })
})

describe('assertValidLocale', () => {
  it.each(['en', 'de', 'pt-BR', 'zh-Hant-TW', 'sr-Latn-RS', 'es-419'])('accepts %s', (locale) => {
    expect(() => assertValidLocale(locale)).not.toThrow()
  })

  it('accepts a tag in any casing, because Intl does', () => {
    expect(() => assertValidLocale('EN-us')).not.toThrow()
    expect(() => assertValidLocale('pt-br')).not.toThrow()
  })

  it('rejects an empty locale', () => {
    expect(() => assertValidLocale('')).toThrow(RangeError)
    expect(() => assertValidLocale('')).toThrow(/Invalid locale ""/)
  })

  it.each(['not_a_locale!', 'en_US', 'e', 'en-', '-en', 'en--US', 'toolongsubtagxyz', ' en'])(
    'rejects the malformed tag %j',
    (locale) => {
      expect(() => assertValidLocale(locale)).toThrow(RangeError)
    },
  )

  it.each([undefined, null, 123, ['en'], {}])(
    'rejects a non-string value %j (Intl.getCanonicalLocales would let several through)',
    (value) => {
      expect(() => assertValidLocale(value)).toThrow(RangeError)
    },
  )

  it('names the offending value in the error', () => {
    expect(() => assertValidLocale('en_US')).toThrow('Invalid locale "en_US"')
    expect(() => assertValidLocale(undefined)).toThrow('Invalid locale undefined')
  })

  it('validates but does not canonicalize: the catalog keeps the tag as written', () => {
    const catalog: MessageCatalog = { locale: 'PT-br', messages: { X: { message: 'x' } } }
    createMessageResolver(catalog)
    expect(catalog.locale).toBe('PT-br')
  })

  it('renders identically for a non-canonical and a canonical tag', () => {
    const entry = { message: { plural: 'n', one: 'um {n}', other: '{n} {n}' } }
    const render = (locale: string) =>
      createMessageResolver({ locale, messages: { X: entry } })({ code: 'X', context: { n: 2 } })
        ?.message
    expect(render('pt-br')).toBe(render('pt-BR'))
    expect(render('EN-us')).toBe(render('en-US'))
  })
})
