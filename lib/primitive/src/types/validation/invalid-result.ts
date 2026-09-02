import type { Severity } from './severity'
import type { Simplify } from 'type-fest'

type InvalidBase<M extends string = string> = {
  valid: false
  severity: Severity
  message: M
  attribute?: string
}

export type InvalidWithFix<M extends string = string> = Simplify<
  InvalidBase<M> & {
    fixable: true
  }
>

export type InvalidWithoutFix<M extends string = string> = Simplify<
  InvalidBase<M> & {
    fixable: false
  }
>

export type InvalidResult<M extends string = string> = InvalidWithFix<M> | InvalidWithoutFix<M>
