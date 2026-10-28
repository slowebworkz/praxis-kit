---
'praxis-kit': minor
---

Add a single-valued `layout` prop to the Tailwind class pipeline. It overrides boolean display
shorthand props, allowing callers to replace component defaults without explicitly unsetting them.
The prop is reserved from host-attribute forwarding and is included in `LayoutPropName` for wrapper
types. `layout="none"` means no display class is injected; use `layout="hidden"` for
`display: none`. Invalid runtime values warn and fall back to boolean shorthand props. Conflicting
`variants.layout` definitions are ignored with development diagnostic `CSS6006`; rename styling
variants to avoid the reserved display-selection prop. TypeScript does not yet reject this conflict
at definition time.
