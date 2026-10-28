---
'praxis-kit': minor
---

Add `validateAriaTabRelationships` to `praxis-kit/html`. For a caller-supplied element scope, it
warns when a `role="tab"` controls a uniquely resolved target that is not a `tabpanel`, and when a
`tabpanel`'s uniquely resolved `aria-labelledby` targets do not include a `tab`. Missing and
ambiguous references are not guessed at.
