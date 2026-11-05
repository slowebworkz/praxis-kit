/**
 * A string-keyed object with values of unknown type. The same alias as `AnyRecord` in
 * `@praxis-kit/foundation`, declared here because this package is published with no dependencies.
 */
export type AnyRecord = Record<string, unknown>

/** A template string, or plural forms chosen by a numeric value in the diagnostic's context. */
export type MessageTemplate =
  | string
  | ({ plural: string; other: string } & Partial<
      Record<'zero' | 'one' | 'two' | 'few' | 'many', string>
    >)

export interface MessageSuggestion {
  title: MessageTemplate
  description?: MessageTemplate
  /** Code to copy. Never translated, never rendered through a template. */
  fix?: string
}

export interface MessageEntry {
  message: MessageTemplate
  rationale?: MessageTemplate
  suggestions?: MessageSuggestion[]
  /** Notes for translators. Never rendered. */
  $comment?: string
}

/** The JSON shape of one locale's catalog (see `schema/catalog.v1.schema.json`). */
export interface MessageCatalog {
  /** The contract major this catalog was written for (`CONTRACT_VERSION.major`). A catalog for a
   *  major this package does not support is ignored by the resolver and rejected by the validator. */
  contract: number
  /** The `major.minor` contract the author last checked against. Advisory only: completeness is
   *  computed from the real differences, never from this. */
  builtAgainst?: string
  /** BCP 47 tag; selects the `Intl.PluralRules` / `Intl.ListFormat` rules. */
  locale: string
  /** Keyed by diagnostic code, or by the message id a code maps to. */
  messages: Readonly<Record<string, MessageEntry>>
}

/** What a catalog entry renders to for one diagnostic. */
export interface RenderedMessage {
  message: string
  rationale?: string
  suggestions?: { title: string; description?: string; fix?: string }[]
}

/**
 * The part of a Praxis Kit diagnostic a resolver reads. Declared structurally so this package has
 * no dependency on `praxis-kit`: any object with these fields works, and Praxis Kit's own
 * `Diagnostic` satisfies it.
 */
export interface DiagnosticFacts {
  code: string
  messageId?: string | undefined
  context?: Readonly<AnyRecord> | undefined
}
