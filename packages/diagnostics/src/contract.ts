// The shape of the versioned contract between Praxis Kit diagnostics and any message catalog.
//
// The data lives in `contract/diagnostics.contract.json`, published as
// `praxis-kit-diagnostics/contract`. It is the single description of every catalog-driven diagnostic:
// which ids exist, which context keys each one carries, and what each key is. A catalog is validated
// against it, never against the English catalog, so a language pack needs no English at all.
//
// This file holds only types and the version constant, so importing it (and so the resolver) never
// pulls the contract's English prose into a bundle.

/**
 * The contract major a catalog must declare. A breaking change to the contract (a context key
 * removed, renamed or retyped, or an id's meaning changed) bumps it; additions bump `minor` in the
 * contract file. The two numbers must match `contract/diagnostics.contract.json` (a test checks).
 */
export const CONTRACT_VERSION = { major: 1, minor: 0 } as const

/**
 * What a context value is, which decides how a template may use it.
 * - `identifier`: a name or token from HTML, ARIA or the author's code. Copy verbatim.
 * - `literal`: a value shown as source text. Copy verbatim.
 * - `number`: a number; may select a plural form.
 * - `string[]`: a list; join it with a list filter, optionally after `quote`.
 * - `text`: prose written by Praxis Kit. None exist in contract 1.
 */
export type ContextKind = 'identifier' | 'literal' | 'number' | 'string[]' | 'text'

export interface ContextKeySpec {
  kind: ContextKind
  /** Always present on the diagnostic. A template may only use required keys, because an absent key
   *  would render as a literal `{key}`. */
  required: boolean
  /** A translation that leaves this key out is wrong (an error); leaving out any other key is only a
   *  warning, since some languages legitimately drop a word. */
  essential: boolean
  /** Carried for tooling only: the English entry never uses it, so a template has no reason to. */
  informational?: boolean
  description: string
}

export interface SpecLink {
  name: string
  url: string
}

/** A diagnostic as Praxis Kit emits it, used for tests and for the translator sheet. */
export interface ContractExample {
  code: string
  messageId?: string
  context?: Readonly<Record<string, unknown>>
}

export interface IdContract {
  /** Every diagnostic code this message id serves (several codes can share one id). */
  codes: string[]
  category: string
  severity?: 'warning' | 'error'
  /** What the rule means and when it fires, written for a translator. */
  description: string
  specs?: SpecLink[]
  context?: Readonly<Record<string, ContextKeySpec>>
  /** The context key whose number selects the plural form. Must be a `number` key. */
  plural?: string
  /** Whether the English entry has a `rationale`. A catalog without one is incomplete, not invalid. */
  rationale: boolean
  /** How many suggestions the English entry has. Fewer is incomplete; more is an unknown field. */
  suggestions: number
  /** The contract version that added this id, as `major.minor`. */
  since: string
  /** Still valid and still renders, but a catalog should move to `replacedBy`. */
  deprecated?: { since: string; replacedBy?: string }
  /** The id was removed in this version. The entry stays as a tombstone so a translation of it is
   *  reported as obsolete (with `replacedBy`) rather than as an unknown id. */
  removedIn?: string
  replacedBy?: string
  examples: ContractExample[]
}

export interface DiagnosticsContract {
  $comment?: string
  contract: number
  minor: number
  kinds: Readonly<Record<ContextKind, string>>
  /** Keyed by the message id a catalog entry uses (the diagnostic code, or a shared id). */
  ids: Readonly<Record<string, IdContract>>
  /** Codes that exist but are not catalog-driven yet, each with the reason. They are not part of
   *  completeness; moving one into `ids` is a compatible addition (a minor bump). */
  notCatalogDriven: Readonly<Record<string, string>>
}

/**
 * An id of your own, for a custom rule (`messageId: 'acme.no-div-dialog'`). The core contract stays
 * authoritative for built-in ids; this describes only the extra ones, so `checkCatalog` can validate a
 * catalog that carries them. Ids must be namespaced: lower-case, with a dot (`acme.rule`).
 */
export interface ExtensionId {
  context?: Readonly<Record<string, ContextKeySpec>>
  plural?: string
  /** Whether entries have a `rationale`. Default false. */
  rationale?: boolean
  /** How many suggestions entries have. Default 0. */
  suggestions?: number
}

export interface ExtensionContract {
  ids: Readonly<Record<string, ExtensionId>>
}
