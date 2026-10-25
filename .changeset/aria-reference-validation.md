---
'praxis-kit': minor
---

Add `validateAriaIdReferences` to `praxis-kit/html`. For a caller-supplied element scope, it reports `aria-labelledby`, `aria-controls` and `aria-activedescendant` ID tokens that are missing or ambiguous (duplicate IDs). It does not validate target roles, ancestry or ownership.
