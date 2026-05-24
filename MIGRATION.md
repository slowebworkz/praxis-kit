# Architecture Migration

This document tracks the planned evolution of the library's internal architecture. It is an internal
planning record, not a user-facing guide. For user-facing migration guides (from CVA, Radix Slot,
Chakra UI), see `MIGRATING.md`.

---

## Context

The library started as a polymorphic component utility — a clean `as`-prop abstraction with minimal
overhead. It has grown significantly beyond that: ARIA enforcement, structural child validation,
multi-framework adapters, a variant composition engine, a slot protocol, and a class pipeline plugin
system.

The name and the architecture no longer match what the system actually does.

The core tension:

```ts
createPolymorphicComponent({ tag: 'div' })
```

— the simplest possible call — currently instantiates the ARIA engine, child validator, and variant
resolver unconditionally. Every consumer pays for the full contract runtime even when they have
declared none of it.

The migration goal is a capability-driven runtime: the factory composes only the subsystems declared
in the configuration. A primitive component stays primitive at both runtime and bundle size. A
fully-contracted component pays only for the capabilities it declares.

The single-factory ergonomic API is preserved throughout.

---

## Architectural Invariants

These invariants are non-negotiable. Every migration phase and future subsystem must preserve them.

### Primitive Layer Invariants

Primitive-only components must:

- instantiate no semantic enforcement systems
- instantiate no styling runtime
- instantiate no diagnostics runtime
- avoid all ARIA resolution
- avoid child traversal and structural validation

Primitive-only components are rendering abstractions only.

The primitive layer must:

- accept arbitrary render targets
- support custom elements
- support SVG elements
- support non-HTML render targets
- avoid intrinsic HTML-only assumptions

The primitive layer must never:

- validate tag names
- infer accessibility semantics
- contain framework-specific enforcement logic

---

### Contract Runtime Invariants

The contract runtime:

- contains pure semantic and structural logic
- is framework-neutral
- contains no rendering implementation
- contains no styling implementation

Contracts are additive capabilities layered on top of primitives.

Unknown render targets are not invalid. They are semantically unresolved.

---

### Styling Runtime Invariants

The styling runtime:

- is optional
- is capability-activated
- contains no semantic enforcement logic
- contains no renderer assumptions

Variant resolution and semantic enforcement remain independent systems.

---

### Adapter Invariants

Framework adapters:

- are thin execution bindings
- may not implement enforcement logic internally
- may not duplicate contract logic
- may not instantiate semantic systems eagerly

Adapters call into:

- primitive runtime
- contract runtime
- styling runtime

Adapters do not own business logic.

---

### Runtime Invariants

All capability modules must:

- be lazily instantiated
- remain side-effect free
- avoid module-scope registration
- avoid global mutable singleton state

No subsystem may activate unless explicitly declared in configuration.

---

## Dependency Rules

These dependency rules are architectural laws.

Violations are bugs.

### Allowed Dependency Direction

```txt
primitive
  ↑
slot/composition
  ↑
contracts
  ↑
strict runtime
  ↑
framework adapters
  ↑
styling integrations
```

Dependencies flow upward only.

---

### Primitive Layer Rules

`lib/primitive` may not import:

- `lib/contract`
- `lib/styling`
- framework adapters
- diagnostics systems

Primitive is the lowest-level runtime.

---

### Contract Runtime Rules

`lib/contract` may not import:

- framework adapters
- styling runtime
- renderer-specific implementations

Contract logic must remain renderer-neutral.

---

### Styling Runtime Rules

`lib/styling` may not import:

- framework adapters
- semantic enforcement systems

Styling remains orthogonal to semantics.

---

### Adapter Rules

Framework adapters may not:

- import each other
- duplicate contract logic
- contain independent ARIA engines
- contain independent structural validators

Shared logic belongs in `lib/`.

---

## Forbidden Patterns

The migration must not introduce:

- global registries
- module-scope initialization
- eager plugin activation
- cross-layer imports
- adapter-specific semantic behavior
- shared mutable singleton state
- unconditional subsystem instantiation
- hidden capability activation
- framework-specific contract logic
- implicit runtime side effects

If a subsystem activates without configuration declaring it, the architecture has regressed.

---

## Target Architecture

---

### Layer 1 — Render Primitive

The zero-dependency base. Handles rendering concerns only.

Responsibilities:

- `as` prop / tag resolution
- ref forwarding and composition
- prop merging
- event chaining
- slot rendering (`asChild` / `Slottable` protocol)

Contains:

- no ARIA engine
- no child validator
- no variant resolver
- no strict mode
- no diagnostics runtime

Compatible with:

- custom elements
- SVG tags
- non-HTML render targets

This is the low-level adoption path — the thing someone reaches for when they need a polymorphic
primitive without framework-specific boilerplate.

---

### Layer 2 — Contract Runtime

Framework-neutral enforcement. Pure logic, no rendering.

Responsibilities:

- ARIA semantics and implicit role resolution
- invalid attribute detection and stripping
- structural child constraints
- strict mode and violation routing
- diagnostics surface

Activated only when enforcement options are declared.

Not imported or instantiated otherwise.

---

### Layer 3 — Renderer Adapters

Thin execution bindings. One per framework.

#### React

- React 19+
- ref as plain prop
- `current/` + `legacy/` split for React 18

#### Vue

- `defineComponent`
- `h()`
- `cloneVNode`

#### Svelte

- `<svelte:element>`
- `$derived()` runes
- factory/component split

#### Solid

- `splitProps`
- `createMemo`
- `Dynamic`

#### Preact

- near-zero delta from React adapter

Adapters call into:

- primitive runtime
- contract runtime
- styling runtime

Adapters do not contain enforcement logic.

---

### Layer 4 — Styling System

Optional augmentation. Not part of the semantic runtime.

Responsibilities:

- variant composition
- compound variants
- presets
- per-tag class overrides
- class pipeline plugins

Activated only when styling options are declared.

Variant resolution and class pipelines are not instantiated for primitive-only components.

---

## Capability-Driven Factory

The single-factory API is preserved.

The factory becomes a capability detector.

### Primitive-only component

```ts
createPolymorphicComponent({
  tag: 'div',
})
```

Activates:

- render primitive only

Does not activate:

- ARIA runtime
- child validation
- variant resolution
- strict diagnostics

---

### Styled component

```ts
createPolymorphicComponent({
  tag: 'button',

  styling: {
    base: 'btn',

    variants: {
      size: {
        sm: 'btn--sm',
        lg: 'btn--lg',
      },
    },
  },
})
```

Activates:

- render primitive
- styling runtime

Does not activate:

- semantic enforcement

---

### Fully-contracted component

```ts
createPolymorphicComponent({
  tag: 'button',

  styling: { ... },

  enforcement: {
    strict: 'warn',
    aria: [...],
    children: [...],
  },
})
```

Activates:

- render primitive
- styling runtime
- semantic enforcement runtime

Each subsystem is instantiated only when its configuration key is present.

---

## Tree-Shaking

Runtime capability gating prevents unnecessary subsystem instantiation.

Bundle-level tree-shaking prevents unnecessary subsystem inclusion.

These are separate optimization goals.

---

### Runtime Gating

Subsystems activate conditionally:

```ts
if (variantResolver) { ... }

if (ariaEngine) { ... }
```

Absent subsystems incur:

- no initialization
- no execution cost

---

### Bundle Graph Elimination

Separate entry points allow bundlers to remove unused runtime layers entirely.

```txt
@polymorphic-ui/core
@polymorphic-ui/core/primitive
@polymorphic-ui/core/contract
@polymorphic-ui/core/styling
```

Goals:

- primitive bundles contain no ARIA code
- primitive bundles contain no variant runtime
- primitive bundles contain no diagnostics runtime

Entry points are additive and do not change the root API.

---

## Repository Structure

Current (as of Phase 2):

```txt
packages/
  core
  react
  vue
  svelte
  solid
  preact
  tailwind
  docs

lib/
  primitive
  contract
  styling
  adapter-utils
  bench
  config
```

How components look when rendered, how they are styled, and application-level composition are the
concern of consumer applications. The repo ships the primitives and contracts — not the outcomes.

---

### `packages/`

Published artifacts:

- versioned
- built
- semver-governed
- npm-facing

Breaking changes require:

- semver bumps
- migration guidance

---

### `lib/`

Internal implementation modules:

- `private: true`
- no npm publication
- no independent semver guarantees
- consumed as TypeScript source

Capability modules belong here:

- ARIA engine
- children validator
- variant resolver
- class pipeline

Internal structure may evolve freely.

---

## Migration Sequence

---

### Phase 1 — Capability-Driven Factory (Complete)

Goals:

- eliminate unconditional subsystem activation
- establish capability boundaries

Tasks:

- ✓ audit `resolveFactoryOptions` (`packages/core/src/options/resolve-factory-options.ts`) — primary
  site of unconditional subsystem setup; identify every subsystem instantiated regardless of config
  presence
- ✓ audit `buildRuntime` (`packages/core/src/factory/`) — where capability handles are created and
  stored on the runtime object
- ✓ audit adapter render paths (`packages/react/src/`, `packages/vue/src/`, etc.) — confirm each
  adapter gates on handle presence before invoking a subsystem
- ✓ derive capability flags (`hasAria`, `hasChildren`, `hasStyling`) from configuration shape
- ✓ gate subsystem construction on flags; null handles for absent capabilities
- ✓ gate render-path execution on runtime handles (null check, not boolean flag)
- ✓ update `BuiltRuntime` / `TypedRuntime` return types to reflect conditional capabilities

Completion criteria:

- ✓ primitive-only components instantiate no semantic runtime
- ✓ primitive-only components instantiate no styling runtime
- ✓ Layer 1 benchmark baseline established — `pnpm bench` run on the primitive-only path after
  gating is complete; this baseline governs all future phases
- ✓ no circular dependency regressions (`pnpm arch:validate`)
- ✓ tests pass

---

### Phase 2 — Repository Restructure (Complete)

Pre-requisite resolved: one package per capability module (`lib/primitive`, `lib/contract`,
`lib/styling`, `lib/adapter-utils`) rather than a single `lib/internals`. Dependency rules are
enforced at the package boundary via `dependency-cruiser` and `eslint-plugin-boundaries`.

Goals:

- separate public packages from internal runtime modules

Tasks:

- ✓ create `lib/` workspace root in `pnpm-workspace.yaml`
- ✓ extract capability modules from `packages/core/src/` into `lib/` packages:
  - `lib/primitive` ← tag resolution, prop merge, slot protocol
  - `lib/contract` ← ARIA engine, children validator, strict mode base
  - `lib/styling` ← variant resolver, class pipeline, plugin API
  - `lib/adapter-utils` ← shared ref composition and event chaining used by multiple adapters
- ✓ audit shared logic across React, Preact, and Vue adapters before extracting; near-identical prop
  merge, ref composition, and slot protocol belongs in `lib/adapter-utils` rather than duplicated
  across packages
- ✓ update `packages/core` to import from `lib/` workspace dependencies
- ✓ move `packages/bench` → `lib/bench`
- ✓ update TypeScript path aliases across all `tsconfig.json` files and `vitest.*.config.ts` files
  to reflect new `lib/` locations
- ✓ update `dependency-cruiser` rules (`.dependency-cruiser.cjs`) to enforce the `lib/` dependency
  direction from this document; `pnpm arch:validate` now covers both `lib/` and `packages/`
- ✓ update `eslint-plugin-boundaries` rules to reflect the new package graph

Completion criteria:

- ✓ all tests pass
- ✓ all builds pass
- ✓ no package imports internal implementation directly
- ✓ `pnpm arch:validate` enforces the dependency rules from this document
- ✓ `pnpm typecheck` clean across all packages with updated aliases

---

### Phase 3 — Separate Entry Points (Complete)

Goals:

- achieve bundle-level subsystem elimination

Tasks:

- ✓ add `/primitive`
- ✓ add `/contract`
- ✓ add `/styling`
- ✓ verify bundle output

Completion criteria:

- ✓ primitive bundle excludes ARIA runtime
- ✓ primitive bundle excludes variant runtime
- ✓ primitive bundle excludes diagnostics runtime
- ✓ bundle analysis confirms elimination

---

### Phase 4 — Documentation and Positioning (Complete)

Tasks:

- ✓ update README
- ✓ update architecture docs (`ARCHITECTURE.md`)
- ✓ update adapter authoring docs (`ADAPTER_AUTHORING.md`)
- ✓ update migration guides (`MIGRATING.md` required no changes)

Completion criteria:

- ✓ layered architecture documented
- ✓ capability-driven model documented
- ✓ public messaging aligned with architecture

---

## Testing Strategy

Every migration phase must include:

- typecheck
- unit tests
- SSR/hydration verification
- bundle analysis
- circular dependency checks
- benchmark verification

---

### Primitive Runtime Tests

Primitive bundles must not contain:

- implicit role maps
- ARIA validators
- child evaluators
- variant resolvers

Primitive render benchmarks must remain within Layer 1 targets.

---

### Contract Runtime Tests

Contract runtime must:

- remain renderer-neutral
- operate independently from adapters
- preserve violation routing behavior

---

### Adapter Tests

All adapters require:

- SSR verification
- hydration parity
- slot protocol consistency
- prop merge consistency

---

## Naming

The name remains:

```txt
@polymorphic-ui/*
```

Polymorphism is the foundational rendering principle.

The capability-driven architecture ensures:

- enforcement is additive
- styling is additive
- semantics are additive

The reframing occurs in the architecture, not the name.

---

## Open Decisions

- **`lib/` package granularity** — resolved: one package per capability module (`lib/primitive`,
  `lib/contract`, `lib/styling`, `lib/adapter-utils`); dependency rules enforced via
  `dependency-cruiser` and `eslint-plugin-boundaries`
- standalone `defineContract()` API exposure
- Svelte `asChild` resolution constraints
- contract inheritance and composition model
- nested contract merging semantics
- extensible custom element semantic metadata

---

## History Rewrite

The current commit history reflects discovery order, not architectural order.

The rewrite occurs only after:

- ✓ capability-driven architecture is complete
- ✓ repository restructure is complete
- ✓ all tests pass

### Approach

The `migration/rewrite` orphan branch is active. All narrative phases have been committed. To
replace `main`:

```bash
git push origin migration/rewrite:main --force
```

No tags exist. No public consumers track commit SHAs. Blast radius is limited to stale PR references
on GitHub, which is acceptable for a pre-release project.

### Commit Narrative

The new history reads as if the system was designed in layer order.

#### Phase 0 — Workspace scaffolding ✓

- repo skeleton, `pnpm-workspace.yaml`, root `package.json`
- TypeScript, ESLint (base + architecture rules), Prettier, git hooks
- GitHub Actions CI pipeline
- `packages/` and `lib/` workspace roots declared

#### Phase 1 — Render Primitive (`lib/primitive`) ✓

- tag resolution, `as`-prop dispatch
- prop merging, event chaining
- slot protocol (`mergeProps`, `applySlot`, `Slottable`, `cloneSlotChild`)
- tests

#### Phase 2 — Contract Runtime (`lib/contract`) ✓

- ARIA engine: implicit role resolution, attribute validation, violation routing
- children validator: rule matching, cardinality, position constraints
- strict mode base (`StrictBase`, `warn` / `violate`)
- tests

#### Phase 3 — Class Pipeline (`lib/styling`) ✓

- variant resolver (CVA integration, LRU cache)
- compound variant matching
- class pipeline and plugin API
- tests

#### Phase 4 — Core factory (`packages/core`) ✓

- capability-driven factory composing `lib/` modules on config shape
- `FactoryOptions` type surface (`styling:`, `enforcement:` namespaces)
- `resolveFactoryOptions`, `BuiltRuntime`, `TypedRuntime`
- entry points: root / `/primitive` / `/contract` / `/styling`
- tests

#### Phase 5 — Framework adapters ✓

One commit per adapter in adoption-complexity order: `packages/react` → `packages/preact` →
`packages/vue` → `packages/solid` → `packages/svelte`

Each commit: adapter implementation + hydration/SSR tests. Shared prop merge, ref composition, and
slot logic extracted into `lib/adapter-utils` before the first adapter commit.

#### Phase 6 — Tailwind plugin ✓

- `packages/tailwind`: layout-mode class filter, plugin API integration

#### Phase 7 — Tooling and documentation ✓

- `lib/bench`: benchmark suites; baseline established
- architecture docs (`ARCHITECTURE.md`), adapter authoring guide (`ADAPTER_AUTHORING.md`), migration
  guides (`MIGRATING.md`)

### Commits to Port

The new history rebuilds from scratch. These commits from current `main` carry non-trivial logic
that must be re-implemented correctly. Use as source references, not patches.

#### Workspace and tooling

- `8f99d32` — TypeScript configuration
- `8b14006` — code quality tooling (ESLint, Prettier)
- `b0321c7` — git hooks
- `19ba8b9` — GitHub Actions CI
- `b40fbbe` — `boundaries/external` → `boundaries/dependencies` migration
- `aa096ef` + `d56afe7` — ESLint config restructure (shared configs, per-package isolation)

#### Render Primitive

- `53013b8` — built-in Slot replacing `@radix-ui/react-slot`
- `004bf91` — slot protocol with Slottable support
- `faa15e7` — Slottable sibling pattern, `as`/`asChild` exclusion

#### Contract Runtime

- `3ee1a39` — implicit role map, record model for ARIA role policy
- `a426bd3` + `226816e` — ARIA attribute policy (global/restricted maps, engine refactor)
- `0c1ee16`, `ef9853f`, `7fe76ce`, `52a8f9e` — AriaContext, ValidationViolation, AriaRule/AriaFix
  contracts
- `cbccef6` — custom `ariaRules` extension point
- `f81c318` — `childRules` wired through FactoryOptions, ChildrenEvaluator invoked in render

#### Class Pipeline

- `2923318` — Tailwind layout-aware class pipeline (earliest variant/pipeline implementation)
- `5a1ef97` — class plugin interface, four-layer `buildRuntime`
- `d193e3f` — plugin prop injection, flex/grid mutual exclusion
- `022633c` — `VariantSelection`, `PresetMap` constraints
- `ee39e0e` — `StaticClassResolver` cache cap, `StrictBase` dedup

#### Core factory

- `40b4e9f` — decompose `createPolymorphic`, harden runtime types
- `9c9c55d` — option namespace refactor (`styling:`, `enforcement:`)
- `33ec817` — `PolymorphicGenerics` bundle, type hardening
- `733deae` — architecture intelligence tooling, circular dep fixes

#### Framework adapters

- `8e43636` — React adapter (`current/` + `legacy/` split)
- `b1702ea` + `3dabac3` — purpose-built Slot stack, post-Slot cleanup
- `c756945` + `496c84e` — render pipeline types, ARIA wiring
- `34ca342` + `08f88ef` + `8d384ce` — Vue 3 adapter, examples, Slottable sibling pattern
- `75099bc` (PR #13) — Preact adapter
- `fb567d4` — Solid adapter
- `45f88eb` — Svelte 5 adapter
- `84cdde9` — SSR smoke tests, hydration parity

#### Tailwind plugin

- `fab45a4` — `createTailwindPipeline` as `ClassPlugin`
- `fe0e069` + `d52dbeb` — flex/grid mutual exclusion

#### Tooling and documentation

- `3057dac` — benchmark suites (factory, render-pipeline, aria, children)
- `9f96a25` + `f8c48aa` — slot bench, extended suites, type cleanup
- `90e19dd` — README and ARCHITECTURE overhaul
- `5bc8f9c` — "Why not X?" comparisons, adapter authoring guide
- `98d037a` — migration guides (CVA, Radix Slot, Chakra UI)
