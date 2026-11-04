# DOM platform helpers

`praxis-kit/dom` provides small, framework-neutral wrappers for native dialog and popover behavior.
They contain no component styling, design-system event conventions, or framework-specific state
management.

## API

- `isBackdropClick(event, dialog)` returns whether an event's target is the dialog element itself.
- `supportsClosedBy()` feature-detects `HTMLDialogElement.prototype.closedBy` and is safe to call
  when `HTMLDialogElement` is unavailable.
- `syncDialogState(dialog, open)` calls `showModal()` or `close()` only when the element's `open`
  state needs to change. It prefers the owning document's prototype methods to bypass instance-level
  wrappers that observe external method calls. Native exceptions propagate to the caller.
- `listenForPopoverToggle(element, onOpenChange)` subscribes to native `toggle` events, maps
  `newState` to a boolean, and returns an unsubscribe function.

The helpers deliberately do not own component state. In particular, `listenForPopoverToggle` reports
the browser's resulting state rather than calling `showPopover()` or `hidePopover()` from inside the
`toggle` handler; mutating popover state in response to its own state-change event can create
redundant toggles or loops. A consuming controller should decide how to reconcile that state with
its framework and desired behavior.

## Example

```ts
import {
  isBackdropClick,
  listenForPopoverToggle,
  supportsClosedBy,
  syncDialogState,
} from 'praxis-kit/dom'

if (supportsClosedBy()) {
  // Configure the native `closedBy` policy where appropriate.
}

dialog.addEventListener('click', (event) => {
  if (isBackdropClick(event, dialog)) closeDialog()
})

syncDialogState(dialog, open)

const unsubscribe = listenForPopoverToggle(popover, (isOpen) => {
  setOpen(isOpen)
})

// Call when the controller is disposed.
unsubscribe()
```

These are low-level platform helpers, not complete Dialog, Popover, Tooltip, or DropdownMenu
implementations. Consumers remain responsible for focus management, keyboard behavior, dismissal
policy, accessibility semantics, and framework lifecycle integration.
