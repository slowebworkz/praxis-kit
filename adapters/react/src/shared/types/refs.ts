import type { ReactElement, Ref } from 'react'
import type { UnknownProps } from './primitives'

/** React's sentinel warning-getter shape, attached to the ref location a given React
 *  version doesn't use, when an element created by the other version is passed in. */
export type ReactWarningGetter = { isReactWarning?: unknown }

/**
 * Canonical ref representation used internally.
 *
 * All helpers normalize missing refs (`undefined`) to `null`, so callers only
 * need to handle two states: a ref exists, or it does not.
 */
export type NormalizedRef = Ref<unknown> | null

/**
 * Raw ref value as it may appear on a React element or props object before
 * normalization.
 *
 * React may omit the property entirely (`undefined`), so this represents the
 * input domain accepted by the compatibility helpers.
 */
export type PossibleRef = NormalizedRef | undefined

/** Cross-version ref reader: reads whichever location a React 18 or 19 element stores
 *  its `ref` in. Injected into `makeCloneSlotChild` since the two adapters disagree on
 *  which location to check first. */
export type GetChildRef = (element: ReactElement) => NormalizedRef

/**
 * Input accepted by the clone operation before props, refs, and event handlers
 * are merged into their final form.
 */
export type CloneInput = {
  child: ReactElement
  slotProps: UnknownProps
  ref: NormalizedRef
}
