# praxis-kit — Claude Code guidance

## Repo overview

Framework-neutral UI infrastructure with enforceable structural and accessibility contracts.
Polymorphism is the entry point; the deeper value is enforcement, runtime normalization, and
deterministic composition across frameworks.

pnpm workspace monorepo with three workspace roots: `packages/` (public-facing tooling), `lib/`
(internal runtime libraries), and `adapters/` (framework adapters).

### packages/ — public-facing tooling

- `@praxis-kit/core` — re-export facade; exposes `primitive`, `styling`, and `contract` sub-entries
  plus a combined root entry. Consumers import from the narrowest entry they need.
- `@praxis-kit/tailwind` — Tailwind layout-aware class pipeline wrapping core
- `@praxis-kit/eslint-plugin` — ESLint rules for enforcing praxis-kit patterns
- `@praxis-kit/ts-plugin` — TypeScript language service plugin with inline diagnostics
- `@praxis-kit/codemod` — Codemods for migrations

### adapters/ — framework adapters

- `@praxis-kit/react` — React adapter; `current/` (React 19+, plain ref prop) and `legacy/` (React
  18, `forwardRef`) both delegate to `shared/render.ts`
- `@praxis-kit/preact` — Preact adapter
- `@praxis-kit/solid` — SolidJS adapter
- `@praxis-kit/svelte` — Svelte 5 adapter
- `@praxis-kit/vue` — Vue 3 adapter
- `@praxis-kit/lit` — Lit adapter
- `@praxis-kit/web` — Vanilla Web Components adapter

### lib/ — internal

- `@praxis-kit/primitive` — Render primitive: tag resolution, prop merge, slot protocol
- `@praxis-kit/styling` — Styling runtime: variant resolver, class pipeline, plugin API
- `@praxis-kit/contract` — Contract runtime: ARIA engine, children validator, strict mode
- `@praxis-kit/adapter-utils` — Shared adapter helpers: `buildCoreRuntime`, `buildEngines`,
  `composeFilter`, `SlotValidator`

Dependency pins use pnpm catalogs (`catalog:` in package.json → `pnpm-workspace.yaml`).

---

## Commands

```bash
pnpm typecheck    # type-check all packages
pnpm test         # run all tests (vitest workspace)
pnpm lint         # ESLint --fix across workspace
pnpm build        # tsup build all packages
pnpm format       # Prettier across workspace
```

Run within a package directory to scope to that package.

---

## Code conventions

### Imports

Type imports and value imports must always be on separate lines, even when from the same module:

```ts
// correct
import { createElement } from 'react'
import type { ReactElement, Ref } from 'react'

// wrong
import { createElement, type ReactElement, type Ref } from 'react'
```

The ESLint rule `@typescript-eslint/consistent-type-imports` with
`fixStyle: 'separate-type-imports'` enforces this.

### Barrel pattern

Three-level hierarchy:

1. **Implementation files** — define and export their own named exports
2. **Local barrel** (`index.ts` in the same directory) — named re-exports; this is the controlled
   API surface for that directory
3. **Parent barrel** (one step up) — `export *` from local barrels; never names specific exports
   from sub-files

Consequence: adding a new export to a file only requires updating one barrel (the local one), not
every level above it.

### Comments

Only add a comment when the WHY is non-obvious — a hidden constraint, a subtle invariant, a
workaround for a specific quirk. Do not describe what the code does. One line max.

### No co-author lines in commits

Do not add `Co-Authored-By` trailers to commit messages.

---

## Key design decisions

### `core` sub-entries

`@praxis-kit/core` has three sub-entry files consumers can import from directly:

- `@praxis-kit/core/primitive` — tag resolution, prop merge, shared types only; no ARIA, no CVA
- `@praxis-kit/core/styling` — everything in `primitive` plus the class pipeline and plugin API
- `@praxis-kit/core/contract` — everything in `primitive` plus the ARIA engine and children
  validator

The root entry re-exports all three. `src/index.ts` remains an `export *` aggregator — do not add
explicit enumerations there.

### Adapter `buildRuntime` pattern

All adapters (react, preact, solid, svelte, vue) share a four-layer pattern via
`@praxis-kit/adapter-utils`:

1. `normalizeOptions` — resolves defaults, returns a shape with no `undefined` fields
2. `buildCoreRuntime` (from `adapter-utils`) — calls `createPolymorphic`, extracts `ownedKeys`
3. `buildEngines` (from `adapter-utils`) — constructs `SlotValidator`, `AriaPolicyEngine`,
   `ChildrenEvaluator`
4. `composeFilter` (from `adapter-utils`) — combines `ownedKeys` with any user `filterProps`

Each layer has a clean input/output contract. Replacing a layer with an injected factory is surgical
if inversion-of-control is ever needed.

### `FactoryOptions` shape

Factory options are organized into three conceptual zones:

```ts
createContractComponent({
  // component identity (top-level)
  tag: 'button',
  name: 'Button',
  defaults: { type: 'button' },

  // class composition
  styling: {
    base: 'btn',
    variants: { size: { sm: 'btn--sm', lg: 'btn--lg' } },
    defaults: { size: 'md' },
    compounds: [...],
    presets: { ghost: { intent: 'ghost' } },
    tags: { a: 'link-style' },
    plugin: createTailwindPipeline,
  },

  // structural enforcement
  enforcement: {
    strict: 'warn',
    aria: [...],
    children: [...],
  },
})
```

`StylingOptions` and `EnforcementOptions` are their own exported types. Internally,
`resolveFactoryOptions` unpacks the nested shape into a flat `ResolvedFactoryOptions` — the flat
shape is the internal contract; the namespaced shape is the public API.

### Preset merging via CVA input

Presets (`styling.presets`) are `Partial<VariantProps<V>>` objects merged _into_ the CVA call as
`{ ...preset, ...props }`. They are not pre-generated class strings. This allows compound variants
to fire across the preset boundary and gives callers a clean override (explicit props always win).

### React version split

`@praxis-kit/react` peer-depends on `react >= 18`. The split is:

- `current/` — React 19+: `ref` is a plain prop, `element.props.ref` for slot access
- `legacy/` — React 18: wraps in `forwardRef`, uses `element.ref` for slot access

Both delegate to `shared/render.ts`. The `legacy/` output is runtime-compatible with React 18
because it only calls `forwardRef`, which exists in both versions. No React 18 dev dependency is
needed.

### `warn()` vs `violate()` in StrictBase

Both methods are silent when `strict: false`. The difference is what happens when strict is truthy:

- `violate()` — throws on `'throw'`/`true`, warns on `'warn'`
- `warn()` — always caps at `console.warn`; never throws even when `strict: 'throw'`

`AriaPolicyEngine` routes `'warning'`-severity violations through `warn()` so they surface in strict
environments without aborting a render. Route `'error'`-severity through `violate()`.

### `src/index.ts` is not a lockdown point

API surface changes happen at the sub-barrel level (e.g. `children/index.ts`, `styles/index.ts`).
The root `src/index.ts` uses `export *` and should not explicitly enumerate exports. Keeping
specificity at the sub-barrel avoids cascade updates when things change.

### Cardinality as a discriminated union

```ts
type Cardinality = { kind: 'bounded'; min: number; max: number } | { kind: 'unbounded' }
```

Unboundedness is encoded in the type, not in a sentinel value (`Infinity`). This enables exhaustive
switches and stronger invariant checks in `ChildrenEvaluator`.

### `exactOptionalPropertyTypes` is active

`{ key: undefined }` and `{}` are distinct shapes. Use conditional spreads when building objects
from optional fields:

```ts
// correct
{ ...( value !== undefined && { key: value }) }

// wrong — violates exactOptionalPropertyTypes
{ key: value ?? undefined }
```

---

## Deferred work (explicitly out of scope — not forgotten)

These items are architecturally decided but not yet implemented. Do not attempt them as part of
routine tasks; they require deliberate scoping.

### Dynamic children analysis in `contractPlugin`

`contractPlugin` validates cardinality for statically-analyzable JSX usage sites (literal arrays,
known JSX children). Usage sites where children are computed dynamically (mapped arrays, conditional
renders, spread children) are skipped silently. Adding dynamic analysis requires a broader data-flow
pass and is deferred.

---

## Planned renames (not yet shipped)

These renames are directionally decided but not released. Use the current names in all code until
the rename ships.

- `styling.presets` / `variantKey` → `styling.recipes` / `recipe`: aligns with Chakra UI, Stitches,
  and Tailwind Labs terminology. A "recipe" is a named variant composition — not a default override.

## Shipped renames

- `createPolymorphicComponent` → `createContractComponent` ✅: shipped as a breaking change. The
  codemod (`@praxis-kit/codemod`) automates migration for consumers.

---

## Pre-commit hook

The hook runs automatically on staged files:

1. Prettier format
2. ESLint --fix
3. `git add` the auto-fixed files
4. TypeScript type-check (only if `.ts`/`.tsx` files are staged)

Do not skip hooks (`--no-verify`) unless explicitly instructed.
