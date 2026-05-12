import type { LayoutKey } from './layout'

export type ClassToken = string

export interface LayoutToken {
  kind: 'layout'
  value: LayoutKey
  raw: string
}

export interface UtilityToken {
  kind: 'utility'
  base: string
  raw: string
}

export interface ConditionalToken {
  kind: 'conditional'
  requires: LayoutKey
  raw: string
}

export interface GapToken {
  kind: 'gap'
  raw: string
}

export type ClassifiedToken = LayoutToken | UtilityToken | ConditionalToken | GapToken
