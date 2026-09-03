import type { EnforcementOptions } from '../types'
import {
  activeProps,
  disabledProps,
  expandedProps,
  invalidProps,
  loadingProps,
  pressedProps,
  readonlyProps,
  selectedProps,
} from '@praxis-kit/contract'

function stateContract(props: NonNullable<EnforcementOptions['props']>): EnforcementOptions {
  return { props }
}

export const activeContract = stateContract([activeProps])
export const disabledContract = stateContract([disabledProps])
export const expandedContract = stateContract([expandedProps])
export const invalidContract = stateContract([invalidProps])
export const loadingContract = stateContract([loadingProps])
export const pressedContract = stateContract([pressedProps])
export const readonlyContract = stateContract([readonlyProps])
export const selectedContract = stateContract([selectedProps])
