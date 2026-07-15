import type { LayoutFamily, LayoutKey } from './layout'
import type { LAYOUT_FAMILY_MAP } from '../constants'
import type { layoutKeys } from '../layout-keys'
import type { EmptyRecord } from '@praxis-kit/primitive'
import type { Simplify } from 'type-fest'
export type ClassToken = string

type Token<TKind extends string, TData extends object = EmptyRecord> = {
  kind: TKind
  raw: string
} & TData

export type LayoutToken = Token<'layout', { value: LayoutKey<typeof layoutKeys> }>
export type ConditionalToken = Token<
  'conditional',
  { requires: Exclude<LayoutFamily<typeof LAYOUT_FAMILY_MAP>, 'none'> }
>
export type GapToken = Token<'gap'>
export type SharedToken = Token<'shared'>
export type UtilityToken = Token<'utility', { base: string }>

export type ClassifiedToken = Simplify<
  LayoutToken | ConditionalToken | GapToken | SharedToken | UtilityToken
>
