import type { ReadonlyDeep } from 'type-fest'
import type { AriaRole, IntrinsicProps, IntrinsicTag } from './primitives'

export type { ValidResult } from '@praxis-ui/shared/types'

export type RemoveAttributeFixKind = `removeAttribute:${string}`
export type FixKind = 'removeRole' | 'setRole' | RemoveAttributeFixKind

export type AriaFixResult =
  | { applied: false; next: ReadonlyDeep<IntrinsicProps> }
  | { applied: true; next: ReadonlyDeep<IntrinsicProps>; previous: ReadonlyDeep<IntrinsicProps> }

export type AriaFix = {
  readonly kind: FixKind
  readonly priority?: number
  readonly source?: string
  readonly apply: (context: AriaContext) => AriaFixResult
}

export type Severity = 'error' | 'warning' | (string & {})

type InvalidBase<M extends string = string> = {
  valid: false
  severity: Severity
  message: M
  attribute?: string
}

/** An invalid rule result that carries an auto-fix. */
export type InvalidWithFix<M extends string = string> = InvalidBase<M> & {
  fixable: true
  fix: AriaFix
}

/** An invalid rule result with no available auto-fix. */
export type InvalidWithoutFix<M extends string = string> = InvalidBase<M> & {
  fixable: false
}

export type InvalidResult<M extends string = string> = InvalidWithFix<M> | InvalidWithoutFix<M>
export type AriaResult = import('@praxis-ui/shared/types').ValidResult | InvalidResult

export type AriaPhase = 'evaluate' | 'fix'

export type AriaContext = {
  readonly tag: IntrinsicTag
  readonly implicitRole: AriaRole | undefined
  readonly effectiveRole: string | undefined
  readonly props: ReadonlyDeep<IntrinsicProps>
}

export type AriaRule<C extends AriaContext = AriaContext> = (context: C) => readonly AriaResult[]
