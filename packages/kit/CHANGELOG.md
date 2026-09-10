# praxis-kit

## 0.1.1

### Patch Changes

- ca74ee2: Fix `ContractProps<typeof Component>` (Lit and Web adapters) dropping `data-*`
  attributes.

  Both adapters' `ContractProps<T>` resolved to the declared prop contract only
  (`OmitIndexSignature` of the component's own props + variant props + `recipe`), with no `data-*`
  key — so a `data-*` a contract sets in `defaults` (`data-slot`, the near-universal styling hook)
  couldn't be typed by a consumer, even though `createContractComponent`'s `_buildProps()` scans
  every attribute set on the custom element into the pipeline and forwards it.

  `data-*` attributes now pass through `ContractProps` with a
  `string | number | boolean | undefined` value type, matching the React adapter. Other global/host
  attributes (`id`, `class`, `slot`, `aria-*`, `role`) remain intentionally outside this type — they
  are DOM globals set on the element directly, not part of a component's declared prop contract;
  `data-*` is the exception because contracts author it as an overridable prop.

- de9153c: Fix `ContractProps<typeof Component>` / `PolymorphicProps` (React) dropping `data-*`
  attributes.

  React's `JSX.IntrinsicElements[tag]` prop types carry no `data-*` index — the JSX checker
  special-cases `data-*` at the call site — so a `data-*` a contract set only in `defaults`
  (`data-slot`, the near-universal styling hook) was absent from the extracted prop type even though
  `<Component data-slot="…" />` type-checks and the runtime forwards it. A wrapper typed with
  `ContractProps<typeof Base>` couldn't destructure `data-slot`, and a `styling.plugin` that
  contributes a discriminated prop union (e.g. `createTailwindPipeline`) turned the whole type into
  a union where `data-*` was no longer a common member.

  `data-*` attributes now pass through `ContractProps` / `PolymorphicProps` /
  `PolymorphicWithAsChild` / `PolymorphicWithRender` with a `string | number | boolean | undefined`
  value type (what React serializes onto a `data-*` attribute).

## 0.1.0

### Minor Changes

- Initial public release of Praxis Kit — HTML semantics, ARIA requirements, and component
  composition rules as executable contracts, shared across React, Preact, Vue, Solid, Svelte, Lit,
  and vanilla Web Components from one npm package.

  **What's in 0.1.0**

  - **`createContractComponent`** — one framework-neutral `FactoryOptions` object drives every
    adapter. Styling / variants / compound variants / named presets, ARIA policy, structural child
    enforcement (`enforcement.children` cardinality), and lifecycle hooks (`onElement`), applied on
    every render.
  - **Seven adapters** — `praxis-kit/{react,react/legacy,preact,vue,solid,svelte,lit,web}`. React
    (18 + 19), Preact, Vue, and Solid are polymorphic VDOM components (`as` / `asChild` / `render`);
    Lit and Web are fixed-identity Custom Element hosts (`options.tag` is the semantic model, not
    the DOM tag) with `renderContractToString` for static serialization.
  - **HTML/ARIA engine** — implicit-role resolution, redundant/disallowed-role advisories,
    role→attribute support and required-property checks, cross-checked against the ARIA-in-HTML and
    WAI-ARIA 1.2 conformance data and drift-tested. `enforcement.diagnostics` selects
    `'silent' | 'warn' | 'throw'`.
  - **Tooling** — `praxis-kit/{eslint,ts-plugin,vite-plugin,codemod}` for build-time and editor-time
    enforcement; `praxis-kit/tailwind` for the flex/grid-aware class pipeline;
    `praxis-kit/{contract,guards,html,utils}` for authoring custom rules.

  The public API is classified into stability tiers in `docs/api-stability.md`. The
  `createContractComponent` / `FactoryOptions` contract is frozen for the `0.1.x` line; other
  surfaces may still move.
