# praxis-kit

## 1.2.0

### Minor Changes

- dee0fa7: `compose: { with }` now accepts an opt-in `allProps?: boolean` flag. When set, the
  composing component's own raw props are forwarded onto `with` (alongside the
  `asChild`/`ref`/`children` it already receives), letting `with`'s own contract resolve its
  variants/`compounds` against them — the same prop surface a hand-written
  `<With {...props} asChild><ThisComponent {...props} /></With>` would give it. Defaults to `false`,
  so existing `compose.with` consumers keep today's exact behavior (`with` renders with its own
  fixed defaults) with no change required. Supported on every adapter `compose` already works on:
  React (current and legacy), Preact, Vue, and Solid/ Svelte's synthesized composition model.

### Patch Changes

- 0dd55a7: Fixed a handful of merge-semantics bugs found during an audit of prop/class/style
  merging:

  - `compose.allProps` (Solid): previously excluded `as`/`class`/`recipe` from the props forwarded
    onto `with`, unlike every other adapter's `allProps`, which forwards the full prop set. Solid
    now forwards the same keys as React/Preact/Vue/Svelte.
  - The shared `asChild`/slot prop-merge policy only recognized the literal key `className` for
    concatenation — Vue/Solid/Svelte's `class` fell through to "child wins" instead of
    concatenating. Both key names now get the same concat policy, and Solid's now-redundant local
    `class`-merge patch was removed.
  - The same merge policy wiped a slot's entire `style` object when the child's `style` was
    explicitly `null`/`undefined` (e.g. from `style={cond ? styleObj : undefined}`), unlike the
    analogous `className: undefined` case, which already degraded gracefully. Both now behave the
    same way.
  - The core `defaults`-vs-caller-props merge (`mergeProps` in `@praxis-kit/primitive`, which runs
    on every render of every component) previously let an explicitly `null`/`undefined` caller prop
    silently overwrite a real configured default. It now falls back to the default in that case,
    matching the common real-world case of a prop forwarded through an intermediate spread with no
    value set.

## 1.1.2

Published as `1.1.2`, not `1.1.0` — the version `changeset` actually computed from the minor
changesets below — because `1.1.0` and `1.1.1` are both already permanently taken on the
`praxis-kit` npm name by the same unrelated, pre-existing package line described under `1.0.2` below
(visible in `npm view praxis-kit versions`, published 2026-06-16). Same shape as that
`1.0.0`/`1.0.1` collision: probed the next number up until one was free. That line jumps straight
from `1.1.1` to `2.0.0`, so `1.1.2` was never published by either line.

### Minor Changes

- b09e15c: Add `enforcement.nativeTagBehavior` — an opt-in flag for components whose behavior (not
  just styling) depends on the resolved tag being one of `allowedAs`, e.g. a `popoverTarget` invoker
  that only functions on button-like elements. When set alongside `allowedAs`, `asChild` now warns
  if the consumer's child resolves to a tag outside `allowedAs`, in the React, Preact, and Vue
  adapters, catching compositions that would silently lose native tag-dependent behavior.
- 3a2bedb: Add `PolymorphicWithAllowedAs<G>` to the React, Preact, Solid, and Vue adapters — a
  `PolymorphicProps<G, TAs>` variant with `as` widened to every tag in `AllowedOf<G>` instead of
  defaulting to a single tag, for consumers building wrapper/forwarding prop types.
- 6fb490b: `as`/`allowedAs` now accept a reference to another praxis-kit component, not just a
  tag-name string — `<Button as={Link}>` works the same way `<Button as="a">` does, with `allowedAs`
  enumerating specific components by reference exactly like it enumerates tag names
  (`allowedAs: ['a', 'button', Link]`, strict enumeration, no bypass). Supported on React, Preact,
  Vue, Solid, and Svelte; Lit and Web don't support `as` at all, so they're unaffected.
- 1ff5e0e: Add `compose: { with: Component }` to `FactoryOptions` — declares that a component always
  renders composed `asChild` into another praxis-kit component, as if the consumer had hand-written
  `<With asChild><ThisComponent {...props} /></With>`. All consumer props land on the composing
  component's own contract exactly as today; `with` always renders bare. Supported on React, Preact,
  Vue, Solid, and Svelte, each synthesized natively for that adapter's own composition model
  (clone-based on React/Preact/Vue, render-callback/snippet-based on Solid/Svelte). Has no effect on
  Lit/Web, which have no `asChild` concept. An explicit `asChild`/`render` from the consumer always
  wins over `compose`.

## 1.0.3

### Patch Changes

- 963dff2: Improve runtime performance by removing an ineffective pipeline cache and optimizing
  foundation iteration, with no public API changes.

## 1.0.2

Published as `1.0.2`, not `1.0.0` or `1.0.1` — both were already taken on the `praxis-kit` npm name
by the unrelated pre-existing package line, as hidden/unpublished versions that don't appear in
`npm view praxis-kit versions` (see `DECISIONS.md`, "npm version collision"). No `1.0.0` or `1.0.1`
of this codebase exists or ever will.

### Major Changes

- Remove `defineContractComponent`, the curried
  `defineContractComponent(options)(createContractComponent)` API superseded by `defineContract`
  (see the accompanying `defineContract` changeset). It is not relocated or deprecated — it is gone
  from every adapter's exports and from `praxis-kit/contract`.

  Migrate a call site from:

  ```ts
  const Button = defineContractComponent({
    tag: 'button',
    name: 'Button',
    defaults: { type: 'button' },
  })(createContractComponent)
  ```

  to:

  ```ts
  const buttonContract = defineContract({
    tag: 'button',
    name: 'Button',
    defaults: { type: 'button' },
  })

  const Button = createContractComponent(buttonContract)
  ```

  Also removes `AnyFactoryOptions`, the type-erased escape hatch re-exported alongside it from every
  adapter and from `praxis-kit/contract`. It has no replacement — the `defineContract` /
  `ContractModel` architecture that replaces `defineContractComponent` doesn't need a separate
  erased-options type.

### Minor Changes

- Add `defineContract` as a typed identity boundary — a standalone declaration step ahead of
  `createContractComponent`, ported through all seven adapters (React current/legacy, Preact, Vue,
  Solid, Lit, Web, Svelte):

  ```ts
  const buttonContract = defineContract({
    tag: 'button',
    name: 'Button',
    props: declareProps<ButtonProps>(),
    defaults: { type: 'button' },
  })

  const Button = createContractComponent(buttonContract)
  ```

  `createContractComponent` now takes a single `ContractModel` generic instead of the previous
  multi-generic `FactoryOptions` signature, and retains the defining contract on the built component
  (`__contract`) so `ContractProps<typeof Button>` and related type helpers resolve against it
  directly. A new `declareProps<Props>()` helper (re-exported from `praxis-kit/contract`) lets a
  contract declare its complete prop shape inline — independent of, and taking precedence over,
  props inferred from `defaults` — closing a gap where a hand-declared prop interface without an
  index signature couldn't otherwise satisfy the props contract.

  Also fixes a Lit/Web plugin-props gap (`styling.plugin`-contributed props were missing from
  `ContractProps`) surfaced while porting the Lit and Web adapters through this change.

### Patch Changes

- Fix `ContractProps<typeof Component>` (React and Preact) breaking under a `styling.plugin` that
  contributes a mutually-exclusive layout union — `createTailwindPipeline`'s
  `ExclusiveTrueProp<LayoutKey>` (`{ flex: true } | { grid: true } | …`, ~22 members) distributed
  through `ContractProps<T, M>`, tripping `TS2590` ("union too complex") on `Omit`/`Pick`/`Merge`
  and `TS2700` on a rest-destructure, and hiding common props like `data-slot`.

  `ContractProps` now collapses that union to one flat shape (every layout key optional `true`)
  before resolving the type — call-site overloads on the component itself are unaffected, so
  `<Component flex grid />` still errors as it should, and `React.ComponentProps<typeof X>` keeps
  its existing strict union. Lit, Web, Solid, and Vue were unaffected and are unchanged.

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
