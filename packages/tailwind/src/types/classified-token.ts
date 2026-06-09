import type { LayoutFamily, LayoutKey } from './layout'
import type { EmptyRecord } from '@praxis-kit/shared'

export type ClassToken = string

type Token<TKind extends string, TData extends object = EmptyRecord> = {
  kind: TKind
  raw: string
} & TData

export type LayoutToken = Token<'layout', { value: LayoutKey }>
export type ConditionalToken = Token<'conditional', { requires: Exclude<LayoutFamily, 'none'> }>
export type GapToken = Token<'gap'>
export type UtilityToken = Token<'utility', { base: string }>

export type ClassifiedToken = LayoutToken | ConditionalToken | GapToken | UtilityToken
