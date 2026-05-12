import type { ReadonlyDeep } from 'type-fest'
import type { AriaRole, IntrinsicProps, IntrinsicTag } from './primitives'

export type AriaFixResult =
  | {
      applied: false
      next: ReadonlyDeep<IntrinsicProps>
    }
  | {
      applied: true
      next: ReadonlyDeep<IntrinsicProps>
      previous: ReadonlyDeep<IntrinsicProps>
    }

export type FixKind = 'removeRole' | 'setRole' | (string & {})

export type AriaFix = {
  readonly kind: FixKind
  readonly apply: (context: AriaContext) => AriaFixResult
}

export type ValidResult = { valid: true }

type Severity = 'error' | 'warning'

type InvalidBase = {
  valid: false
  severity: Severity
  message: string
}

export type InvalidWithFix = InvalidBase & {
  fixable: true
  fix: AriaFix
}

export type InvalidWithoutFix = InvalidBase & {
  fixable: false
}
export type InvalidResult = InvalidWithFix | InvalidWithoutFix

export type AriaResult = ValidResult | InvalidResult

export type AriaPhase = 'evaluate' | 'fix'

export type AriaContext = {
  readonly tag: IntrinsicTag
  readonly implicitRole: AriaRole | undefined
  readonly props: ReadonlyDeep<IntrinsicProps>
}

export type AriaRule<C extends AriaContext = AriaContext> = (context: C) => AriaResult
