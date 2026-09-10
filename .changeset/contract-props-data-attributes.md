---
"praxis-kit": patch
---

Fix `ContractProps<typeof Component>` / `PolymorphicProps` (React) dropping `data-*` attributes.

React's `JSX.IntrinsicElements[tag]` prop types carry no `data-*` index — the JSX checker
special-cases `data-*` at the call site — so a `data-*` a contract set only in `defaults`
(`data-slot`, the near-universal styling hook) was absent from the extracted prop type even though
`<Component data-slot="…" />` type-checks and the runtime forwards it. A wrapper typed with
`ContractProps<typeof Base>` couldn't destructure `data-slot`, and a `styling.plugin` that
contributes a discriminated prop union (e.g. `createTailwindPipeline`) turned the whole type into a
union where `data-*` was no longer a common member.

`data-*` attributes now pass through `ContractProps` / `PolymorphicProps` /
`PolymorphicWithAsChild` / `PolymorphicWithRender` with a `string | number | boolean | undefined`
value type (what React serializes onto a `data-*` attribute).
