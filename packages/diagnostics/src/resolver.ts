import { isDefined, isNumber, isString, isUndefined } from '@praxis-kit/foundation'
import { CONTRACT_VERSION } from './contract'
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
      `Invalid locale ${isString(locale) ? `"${locale}"` : String(locale)}: expected a BCP 47 language tag such as "en" or "pt-BR".`,
    )
  }
  if (!isString(locale) || locale === '') return bad()
  try {
    Intl.getCanonicalLocales(locale)
  } catch {
    bad()
  }
}

/** Something the resolver set aside instead of failing. */
export interface ResolverIssue {
  kind: 'invalid-contract' | 'contract-incompatible' | 'render-failed'
  /** The locale of the catalog concerned, when it has a valid one. */
  locale?: string
  /** The message id, for `render-failed`. */
  id?: string
  /** A developer-facing explanation (English; never shown to users). */
  message: string
}

export interface ResolverOptions {
  /**
   * Catalog(s) to try, in order, when the requested catalog has no entry for a diagnostic. Opt-in on
   * purpose: passing English here ships English in the bundle, which a French-only build avoids by
   * leaving it out. Fallback is per diagnostic, never per field, so a French entry missing its
   * rationale is not topped up with an English one.
   */
  fallback?: MessageCatalog | readonly MessageCatalog[]
  /**
   * Called when a catalog is ignored or an entry fails to render. Reporting never fails because of
   * either; this only lets an app notice. Errors thrown by the callback are swallowed.
   */
  onIssue?: (issue: ResolverIssue) => void
}

function usable(
  catalog: MessageCatalog,
  report: (issue: ResolverIssue) => void,
): MessageCatalog | undefined {
  // A malformed locale is a configuration mistake found at startup, where it is cheap to fix, so it
  // throws. Everything below degrades.
  assertValidLocale(catalog.locale)
  const declared: unknown = catalog.contract
  if (!isNumber(declared) || !Number.isInteger(declared) || declared < 1) {
    report({
      kind: 'invalid-contract',
      locale: catalog.locale,
      message: `The "${catalog.locale}" catalog has no valid "contract" and was ignored.`,
    })
    return undefined
  }
  if (declared !== CONTRACT_VERSION.major) {
    report({
      kind: 'contract-incompatible',
      locale: catalog.locale,
      message: `The "${catalog.locale}" catalog is for contract ${declared}, but this version of praxis-kit-diagnostics implements contract ${CONTRACT_VERSION.major}. It was ignored.`,
    })
    return undefined
  }
  return catalog
}

/**
 * Builds a resolver from a catalog. Pass it to `createDiagnostics` (from `praxis-kit/contract`) so
 * the instance, and only that instance, reports in that language:
 *
 * ```ts
 * const diagnostics = createDiagnostics('warn', { messages: createMessageResolver(fr) })
 * ```
 *
 * The chain is the catalog, then `options.fallback`, then nothing. When nothing has an entry the
 * resolver returns `undefined` and Praxis Kit prints the diagnostic's code, so English is only ever
 * used if the app asked for it. The resolver never throws while resolving: an entry that fails to
 * render counts as missing, and a catalog for an unsupported contract is ignored (see `onIssue`).
 */
export function createMessageResolver(
  catalog: MessageCatalog,
  options: ResolverOptions = {},
): MessageResolver {
  const report = (issue: ResolverIssue): void => {
    try {
      options.onIssue?.(issue)
    } catch {
      // A broken callback must not take diagnostics down with it.
    }
  }
  const fallback = isUndefined(options.fallback) ? [] : [options.fallback].flat()
  const chain = [catalog, ...fallback]
    .map((candidate) => usable(candidate, report))
    .filter((candidate): candidate is MessageCatalog => isDefined(candidate))

  return (diagnostic) => {
    const id = diagnostic.messageId ?? diagnostic.code
    for (const candidate of chain) {
      // Own properties only: `messages` is a plain object, so an id like "constructor" or "toString"
      // (a custom rule can choose any messageId) would otherwise resolve an inherited member.
      const entry = Object.hasOwn(candidate.messages, id) ? candidate.messages[id] : undefined
      if (isUndefined(entry)) continue
      try {
        return renderEntry(entry, id, diagnostic.context ?? {}, candidate.locale)
      } catch (error_) {
        report({
          kind: 'render-failed',
          locale: candidate.locale,
          id,
          message: `The "${candidate.locale}" entry "${id}" failed to render: ${String(error_)}`,
        })
      }
    }
    // No catalog has an entry: nothing to add, and Praxis Kit prints the code.
    return
  }
}
