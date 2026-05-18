import type { LayoutKey } from './layout'

export type ClassToken = string

type Token<TKind extends string, TData extends object = Record<never, never>> = {
  kind: TKind
  raw: string
} & TData

export type LayoutToken = Token<'layout', { value: LayoutKey }>
export type ConditionalToken = Token<'conditional', { requires: LayoutKey }>
export type GapToken = Token<'gap'>
export type UtilityToken = Token<'utility', { base: string }>

export type ClassifiedToken = LayoutToken | ConditionalToken | GapToken | UtilityToken
