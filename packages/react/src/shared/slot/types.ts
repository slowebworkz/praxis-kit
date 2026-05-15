import type { AnyRecord } from '@polymorphic-ui/core'

export type SlotProps = AnyRecord & {
  children?: unknown
}

export interface SlotValidationResult {
  valid: boolean
  reason?: string
}

/**
 * 'single'        — exactly one element after normalization; Fragments count as one opaque element.
 * 'strict-single' — exactly one concrete React element; Fragments are not permitted as the slot child.
 */
export type SlotChildPolicy = 'single' | 'strict-single'
