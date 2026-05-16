import type { AnyRecord } from '@polymorphic-ui/core'

/** Generic React event handler. Args default to `unknown[]` so call-sites can narrow as needed. */
export type EventHandler<Args extends unknown[] = unknown[]> = (...args: Args) => void

/** Signature shared by every entry in the `policyHandlers` dispatch table. */
export type MergePolicyHandler = (slotVal: unknown, childVal: unknown) => unknown

/** Loose prop bag accepted by a Slot component; children are typed as `unknown` to avoid forcing ReactNode on callers. */
export type SlotProps = AnyRecord & {
  children?: unknown
}

/** Result returned by `SlotValidator` after evaluating a candidate slot child. */
export interface SlotValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Controls how strictly the Slot enforces its child shape.
 *
 * `'single'`        — exactly one element after normalization; Fragments count as one opaque element.
 * `'strict-single'` — exactly one concrete React element; Fragments are not permitted as the slot child.
 */
export type SlotChildPolicy = 'single' | 'strict-single'
