import type { ReactElement, Ref } from 'react'
import type { UnknownProps } from '../types'

/** Generic React event handler. Args default to `unknown[]` so call-sites can narrow as needed. */
export type EventHandler<Args extends unknown[] = unknown[]> = (...args: Args) => void

/** Signature shared by every entry in the `policyHandlers` dispatch table. */
export type MergePolicyHandler = (slotVal: unknown, childVal: unknown) => unknown

/** Loose prop bag accepted by a Slot component; children are typed as `unknown` to avoid forcing ReactNode on callers. */
export type SlotProps = UnknownProps & {
  children?: unknown
}

/** Version-specific function that merges slot props into a child element and returns the clone. */
export type CloneSlotChildFn = (args: {
  child: ReactElement
  slotProps: UnknownProps
  ref: Ref<unknown> | null
}) => ReactElement
