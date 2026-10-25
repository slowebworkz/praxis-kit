---
'praxis-kit': minor
---

Add `validateAriaListboxRelationships` to `praxis-kit/html`. For a caller-supplied, ordered element scope (with optional `parentIndex` ancestry), it reports `role="option"` elements with no listbox owner, `aria-owns` targets that are not options, and `aria-activedescendant` references that are missing, ambiguous, not an option, or not owned by the listbox.
