import type { Severity } from './severity'

type InvalidBase<M extends string = string> = {
  valid: false
  severity: Severity
  message: M
  attribute?: string
}

export type InvalidWithFix<M extends string = string> = InvalidBase<M> & {
  fixable: true
}

export type InvalidWithoutFix<M extends string = string> = InvalidBase<M> & {
  fixable: false
}

export type InvalidResult<M extends string = string> = InvalidWithFix<M> | InvalidWithoutFix<M>
