# praxis-kit

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
