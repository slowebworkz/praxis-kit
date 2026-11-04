import type { AnyRecord } from '@praxis-kit/primitive'
import type { AriaIdElement } from '../aria-reference-index'

/** Minimal element shape accepted by the document-level ARIA relationship checks. */
export interface AriaReferenceElement extends AriaIdElement {
  readonly props?: Readonly<AnyRecord>
  readonly role?: string | null
  /** Optional structural parent ID supplied by a tree-aware caller. */
  readonly parentId?: string | null
}

export type AriaIdLookup<T = AriaReferenceElement> =
  | { readonly status: 'missing'; readonly id: string }
  | { readonly status: 'ambiguous'; readonly id: string; readonly matches: readonly T[] }
  | { readonly status: 'resolved'; readonly id: string; readonly element: T }

export type AriaResolvedLookup<T = AriaReferenceElement> = Extract<
  AriaIdLookup<T>,
  { readonly status: 'resolved' }
>
export type AriaUnresolvedLookup<T = AriaReferenceElement> = Exclude<
  AriaIdLookup<T>,
  { readonly status: 'resolved' }
>

/** Internal ID lookup over a caller-supplied scope (distinct from the public `AriaReferenceIndex<T>`). */
export interface AriaIdLookupIndex {
  /** Look up one ID token without choosing between duplicate IDs. */
  lookup(id: string): AriaIdLookup
  /** Look up every token of an ARIA IDREFS value, splitting on any whitespace. */
  resolveList(value: unknown): readonly AriaIdLookup[]
}

export type AriaReferenceAttribute = 'aria-labelledby' | 'aria-controls' | 'aria-activedescendant'

export type UnresolvedReferenceCode = 'missing-target' | 'ambiguous-target'

export interface AriaRelationshipDiagnosticBase {
  readonly valid: false
  readonly severity: 'warning'
  readonly sourceIndex: number
  readonly message: string
}

/** A relationship diagnostic with a validator-specific `code` and optional extra fields. */
export type AriaRelationshipDiagnostic<
  Code extends string,
  Extra = unknown,
> = AriaRelationshipDiagnosticBase & { readonly code: Code } & Extra
