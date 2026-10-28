import { isUndefined } from '@praxis-kit/guards'

/**
 * Framework-neutral wrappers for native dialog and popover platform behavior.
 *
 * These helpers intentionally do not prescribe component state, event names, or
 * accessibility policy. Callers own those decisions.
 */

/**
 * Returns whether a click event targeted the dialog element itself rather than
 * content inside it. This is the native `<dialog>` backdrop-click test.
 */
export function isBackdropClick(event: Event, node: HTMLDialogElement): boolean {
  return event.target === node
}

/**
 * Whether this runtime exposes the native `HTMLDialogElement.closedBy` API.
 * Safe to call in non-browser environments where `HTMLDialogElement` is absent.
 */
export function supportsClosedBy(): boolean {
  return !isUndefined(HTMLDialogElement) && 'closedBy' in HTMLDialogElement.prototype
}

/**
 * Idempotently synchronizes a dialog's open state.
 *
 * A closed-to-open transition uses `showModal()`; an open-to-closed transition
 * uses `close()`. Native exceptions (for example, trying to show a dialog that is
 * not connected) are deliberately allowed to propagate to the caller.
 */
export function syncDialogState(node: HTMLDialogElement, open: boolean): void {
  if (open === node.open) return

  // Prefer the owning realm's prototype methods. This bypasses instance-level
  // wrappers that may observe public `showModal()`/`close()` calls as external
  // state changes, while still invoking the native method with the right receiver.
  const prototype = node.ownerDocument.defaultView?.HTMLDialogElement.prototype

  if (open) {
    const showModal = prototype?.showModal ?? node.showModal
    showModal.call(node)
  } else {
    const close = prototype?.close ?? node.close
    close.call(node)
  }
}

/**
 * Subscribes to native Popover API `toggle` events and reports the resulting
 * open state. Returns an unsubscribe function. The callback receives `true`
 * for `newState === 'open'` and `false` for `newState === 'closed'`.
 *
 * State synchronization (including whether to call `showPopover()` or
 * `hidePopover()`) remains the caller's responsibility; doing that directly
 * from the `toggle` callback can create a toggle loop.
 */
export function listenForPopoverToggle(
  node: HTMLElement,
  onOpenChange: (open: boolean) => void,
): () => void {
  const handleToggle = (event: Event): void => {
    const newState = (event as Event & { newState?: string }).newState
    if (newState === 'open') onOpenChange(true)
    else if (newState === 'closed') onOpenChange(false)
  }

  node.addEventListener('toggle', handleToggle)
  return () => node.removeEventListener('toggle', handleToggle)
}
