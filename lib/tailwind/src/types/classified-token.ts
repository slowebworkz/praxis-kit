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

// Value type of an object/record, e.g. { a: 'x', b: 'y' } -> 'x' | 'y'.
type ValueOf<T> = T[keyof T]

type TokenData = {
  layout: { value: LayoutKey<typeof layoutKeys> }
  conditional: { requires: Exclude<LayoutFamily<typeof LAYOUT_FAMILY_MAP>, 'none'> }
  gap: EmptyRecord
  shared: EmptyRecord
  utility: { base: string }
}

type TokenMap = {
  [K in keyof TokenData]: Token<K, TokenData[K]>
}

export type LayoutToken = TokenMap['layout']
export type ConditionalToken = TokenMap['conditional']
export type GapToken = TokenMap['gap']
export type SharedToken = TokenMap['shared']
export type UtilityToken = TokenMap['utility']

export type ClassifiedToken = Simplify<ValueOf<TokenMap>>
