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

/** The JSON shape of one locale's catalog (see `lib/messages/schema/messages.schema.json`). */
export interface MessageCatalog {
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
  context?: Readonly<Record<string, unknown>> | undefined
}
