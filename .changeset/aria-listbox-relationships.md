---
'praxis-kit': minor
---

Add `validateAriaListboxRelationships` to `praxis-kit/html`. For a caller-supplied, ordered element scope (with optional `parentIndex` ancestry), it reports `role="option"` elements with no listbox owner (by ancestry or `aria-owns`) and `aria-activedescendant` references on a listbox that are missing, ambiguous, not an option, or not owned by that listbox.
