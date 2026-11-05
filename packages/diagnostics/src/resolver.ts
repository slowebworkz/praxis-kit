import { renderEntry } from './render'
import type { DiagnosticFacts, MessageCatalog, RenderedMessage } from './types'

/** Turns a diagnostic's facts into text. Structurally compatible with Praxis Kit's `MessageResolver`. */
export type MessageResolver = (diagnostic: DiagnosticFacts) => RenderedMessage | undefined

/**
 * Throws a `RangeError` naming the bad value if `locale` is not a well-formed BCP 47 tag.
 * `Intl.PluralRules` and `Intl.ListFormat` throw on one while a diagnostic is being rendered, which
 * is the worst moment to find out, so catalogs are checked up front.
 *
 * It validates but does not canonicalize: the tag is stored exactly as written. That is
 * intentional. `Intl` accepts any well-formed tag in any casing ("EN-us", "pt-br") and treats it
 * like its canonical form, so there is nothing to gain from rewriting it, and the catalog stays
 * byte-for-byte what its author wrote. A value that is not a string at all (a catalog loaded from
 * JSON can have `locale` missing or numeric) is rejected here too, because
 * `Intl.getCanonicalLocales(undefined)` returns `[]` instead of throwing.
 */
export function assertValidLocale(locale: unknown): asserts locale is string {
  const bad = (): never => {
    throw new RangeError(
      `Invalid locale ${typeof locale === 'string' ? `"${locale}"` : String(locale)}: expected a BCP 47 language tag such as "en" or "pt-BR".`,
    )
  }
  if (typeof locale !== 'string' || locale === '') return bad()
  try {
    Intl.getCanonicalLocales(locale)
  } catch {
    bad()
  }
}

/**
 * Builds a resolver from one catalog. Pass it to `createDiagnostics` (from `praxis-kit/contract`) so
 * the instance, and only that instance, reports in that language:
 *
 * ```ts
 * const diagnostics = createDiagnostics('warn', { messages: createMessageResolver(en) })
 * ```
 *
 * A diagnostic the catalog has no entry for resolves to `undefined`, and Praxis Kit then falls back
 * to the diagnostic's code. English is never substituted.
 */
export function createMessageResolver(catalog: MessageCatalog): MessageResolver {
  assertValidLocale(catalog.locale)
  return (diagnostic) => {
    const id = diagnostic.messageId ?? diagnostic.code
    // Own properties only: `messages` is a plain object, so an id like "constructor" or "toString"
    // (a custom rule can choose any messageId) would otherwise resolve an inherited member.
    const entry = Object.hasOwn(catalog.messages, id) ? catalog.messages[id] : undefined
    return entry && renderEntry(entry, id, diagnostic.context ?? {}, catalog.locale)
  }
}
