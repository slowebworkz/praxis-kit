---
'praxis-kit': patch
---

Fix base display-class injection when a matching display utility has a variant prefix. Previously,
`<Box flex className="md:flex">` could render only `md:flex`, omitting the base `flex` class.

Responsive and state-prefixed display literals such as `hover:flex` and `md:hidden` are filtered
from the resolved class string rather than standing in for the unconditional display class selected
by `layout` or boolean shorthand props. This is a visible class-output change for affected cases.
Important display utilities such as `md:!flex` remain available as the documented escape hatch.
