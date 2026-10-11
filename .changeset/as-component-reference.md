---
'praxis-kit': minor
---

`as`/`allowedAs` now accept a reference to another praxis-kit component, not just a tag-name string
— `<Button as={Link}>` works the same way `<Button as="a">` does, with `allowedAs` enumerating
specific components by reference exactly like it enumerates tag names
(`allowedAs: ['a', 'button', Link]`, strict enumeration, no bypass). Supported on React, Preact,
Vue, Solid, and Svelte; Lit and Web don't support `as` at all, so they're unaffected.
