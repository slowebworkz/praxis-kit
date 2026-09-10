---
"praxis-kit": patch
---

Fix `ContractProps<typeof Component>` (Lit and Web adapters) dropping `data-*` attributes.

Both adapters' `ContractProps<T>` resolved to the declared prop contract only (`OmitIndexSignature`
of the component's own props + variant props + `recipe`), with no `data-*` key — so a `data-*` a
contract sets in `defaults` (`data-slot`, the near-universal styling hook) couldn't be typed by a
consumer, even though `createContractComponent`'s `_buildProps()` scans every attribute set on the
custom element into the pipeline and forwards it.

`data-*` attributes now pass through `ContractProps` with a `string | number | boolean | undefined`
value type, matching the React adapter. Other global/host attributes (`id`, `class`, `slot`,
`aria-*`, `role`) remain intentionally outside this type — they are DOM globals set on the element
directly, not part of a component's declared prop contract; `data-*` is the exception because
contracts author it as an overridable prop.
