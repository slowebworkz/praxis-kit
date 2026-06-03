import type { ReadonlyDeep } from 'type-fest'
import type { IntrinsicTag } from '@praxis-ui/shared/types'
import type { AriaRole } from './aria-role'
import type { IntrinsicProps } from './contract-primitives'

export type AriaFixResult =
  | { applied: false; next: ReadonlyDeep<IntrinsicProps> }
  | { applied: true; next: ReadonlyDeep<IntrinsicProps>; previous: ReadonlyDeep<IntrinsicProps> }

export type RemoveAttributeFixKind = `removeAttribute:${string}`
export type FixKind = 'removeRole' | 'setRole' | RemoveAttributeFixKind

export type AriaFix = {
  readonly kind: FixKind
  readonly priority?: number
  readonly source?: string
  readonly apply: (context: AriaContext) => AriaFixResult
}

export type ValidResult = { valid: true }

export type Severity = 'error' | 'warning' | (string & {})

type InvalidBase<M extends string = string> = {
  valid: false
  severity: Severity
  message: M
  attribute?: string
}

export type InvalidWithFix<M extends string = string> = InvalidBase<M> & {
  fixable: true
  fix: AriaFix
}

export type InvalidWithoutFix<M extends string = string> = InvalidBase<M> & {
  fixable: false
}

export type InvalidResult<M extends string = string> = InvalidWithFix<M> | InvalidWithoutFix<M>

export type AriaResult = ValidResult | InvalidResult

export type AriaPhase = 'evaluate' | 'fix'

export type AriaContext = {
  readonly tag: IntrinsicTag
  readonly implicitRole: AriaRole | undefined
  readonly effectiveRole: string | undefined
  readonly props: ReadonlyDeep<IntrinsicProps>
}

export type AriaRule<C extends AriaContext = AriaContext> = (context: C) => readonly AriaResult[]
