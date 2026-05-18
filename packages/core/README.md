# @polymorphic-ui/core

Framework-agnostic runtime for polymorphic UI components. Handles tag resolution, prop merging,
variant class generation, children structure validation, and ARIA policy enforcement. Framework
adapters (e.g. `@polymorphic-ui/react`) consume the `PolymorphicRuntime` this package produces.

The package is designed as runtime infrastructure rather than a framework-specific component
library. The core runtime is responsible for semantic resolution, policy enforcement, validation,
and class orchestration. Framework adapters are responsible only for rendering concerns.

---

## Terminology

| Term             | Meaning                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Runtime          | The immutable `PolymorphicRuntime` object produced by `createPolymorphic`.                     |
| Resolver         | A subsystem that derives a value from normalized runtime state (e.g. tag or class resolution). |
| Validator        | A subsystem that evaluates structure or semantics and reports violations.                      |
| Policy engine    | A validator capable of evaluating and optionally mutating/fixing state.                        |
| Preset           | A named partial variant configuration merged into variant props before CVA evaluation.         |
| Owned prop       | A prop key consumed internally by the runtime or plugin system and stripped before render.     |
| Structural child | A child participating in rule-based validation inside `ChildrenEvaluator`.                     |
| Adapter          | Framework-specific integration layer responsible for rendering and framework interop.          |

---

## Core invariants

The runtime relies on several architectural invariants:

- Runtime options are immutable after normalization.
- Caller props always override preset props.
- Validation always operates on normalized children.
- ARIA evaluation always runs against a pre-fix snapshot.
- Variant ownership and plugin ownership are tracked independently.
- Runtime behavior is deterministic after option normalization.
- Framework adapters never mutate runtime configuration.
- Validation systems report complete violation batches whenever possible.

These invariants exist to ensure deterministic rendering, stable diagnostics, and predictable
cross-framework behavior.

---

## Entry point

```ts
import { createPolymorphic } from '@polymorphic-ui/core'

const runtime = createPolymorphic({
  defaultTag: 'button',
  variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
  defaultVariants: { size: 'sm' },
  displayName: 'Button',
})
```

`createPolymorphic` normalizes the options, builds the class pipeline, and returns a
`PolymorphicRuntime` object with three resolver methods and an `options` field.

---

## High-level lifecycle

```txt
FactoryOptions
  → resolveFactoryOptions
  → ResolvedFactoryOptions
  → createClassPipeline
  → PolymorphicRuntime
  → framework adapter
  → validation + policy enforcement
  → render
```

The runtime itself is framework-agnostic. Adapters consume the runtime and integrate it into a
specific rendering environment.

---

## Package structure

```
src/
  factory/       createPolymorphic — the public entry point
  options/       resolveFactoryOptions — normalizes FactoryOptions → ResolvedFactoryOptions
  resolver/      resolveTag
  styles/        class pipeline: StaticClassResolver, VariantClassResolver, createClassPipeline
  children/      structural validation: ChildrenEvaluator and its four collaborators
  validator/     ARIA policy: AriaPolicyEngine, aria-role-policy
  base/          StrictBase — shared strict-mode behavior
  utils/         cn (clsx wrapper), mergeProps
  types/         all shared TypeScript types
```

The package is intentionally decomposed into isolated runtime subsystems:

- **Normalization** — resolves defaults and freezes configuration.
- **Resolution** — derives tags, props, and classes.
- **Validation** — enforces structural and semantic correctness.
- **Policy** — evaluates ARIA semantics and applies optional fixes.
- **Adapters** — bridge runtime behavior into framework rendering environments.

---

## The factory and runtime

`createPolymorphic` calls `resolveFactoryOptions` to produce a frozen `ResolvedFactoryOptions`
object (defaults filled in, optional fields conditionally spread to satisfy
`exactOptionalPropertyTypes`). It then calls `createClassPipeline` with those resolved options and
closes over the result.

The frozen `ResolvedFactoryOptions` object acts as the single source of truth for all downstream
runtime behavior.

The returned `PolymorphicRuntime` exposes:

| Method                                                | What it does                                                                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `resolveTag()` / `resolveTag(as)`                     | Returns `as` if provided, otherwise `defaultTag`. Overloaded so the no-argument call returns exactly `TDefault`, not a union. |
| `resolveProps(props)`                                 | Shallow-merges `defaultProps` under caller props. Caller wins on any key conflict.                                            |
| `resolveClasses(tag, props, className?, variantKey?)` | Runs the full class pipeline and returns the final class string.                                                              |
| `options`                                             | The frozen `ResolvedFactoryOptions` — single source of truth for all downstream behavior.                                     |
| `classPlugin`                                         | Optional instantiated class plugin containing the active class pipeline and ownership metadata.                               |

---

## Adapter boundary

Framework adapters consume `PolymorphicRuntime` and are responsible for:

- Rendering framework-specific elements/components.
- Normalizing framework children into `unknown[]`.
- Filtering owned props before render.
- Wiring runtime diagnostics into framework behavior.
- Passing normalized runtime state into validators.

The runtime itself remains framework-agnostic and intentionally avoids direct rendering concerns.

This separation allows:

- React, Vue, Svelte, or Solid adapters to share identical runtime semantics.
- Runtime behavior to remain deterministic across frameworks.
- Validation and policy systems to evolve independently from rendering.

---

## The class pipeline

`createClassPipeline` composes two resolvers and `cn` (a `clsx` wrapper):

### StaticClassResolver

Handles `baseClassName` and `tagMap`. On each call it returns:

- Just `baseClassName` when no `tagMap` is configured, or when `variantKey` is active (preset
  rendering bypasses tag-map to avoid conflicting with preset intent).
- `baseClassName + tagMap[tag]` otherwise, with a per-tag string cache.

### VariantClassResolver

Handles CVA variant resolution and presets. On each `resolve({ props, variantKey })` call:

1. Looks up the cache. On a hit, promotes the entry to most-recently-used by deleting and re-adding
   its key to `#cacheOrder` (a `Set` whose iteration order is insertion order), then returns the
   cached string.
2. On a miss, calls `#compute`: looks up `presetMap[variantKey]` (defaults to `{}`), then calls
   `cvaFn({ ...preset, ...props })`. Preset props are merged _under_ caller props so explicit caller
   values always win and compound variants can fire across the preset boundary.
3. Stores the result. Evicts the least-recently-used entry when the cache exceeds 1000 entries (the
   head of `#cacheOrder` after LRU promotion).

The cache key is a sorted, type-prefixed serialisation of props + variantKey. Type prefixes (`s:`,
`b:`, `u`, `n`) prevent collisions between e.g. the string `"undefined"` and an absent value.

### Pipeline composition

```txt
tag + props + className? + variantKey?
  → StaticClassResolver.resolve(tag, hasVariantKey)     → staticClasses
  → VariantClassResolver.resolve({ props, variantKey }) → variantClasses
  → cn(staticClasses, variantClasses, className)        → final string
```

---

## The class plugin system

`createPolymorphic` accepts an optional `classPlugin` field — a `ClassPluginFactory` that replaces
the default `createClassPipeline` with a custom implementation.

```ts
const runtime = createPolymorphic({
  defaultTag: 'div',
  variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
  classPlugin: (options) => createTailwindPipeline(options),
})
```

### ClassPluginFactory

```ts
type ClassPluginFactory = <V extends VariantMap>(options: ClassPipelineOptions<V>) => ClassPlugin
```

The factory is called once at `createPolymorphic` time with the resolved `ClassPipelineOptions` and
must return a `ClassPlugin`. It is generic over `V` to remain assignable under
`exactOptionalPropertyTypes` regardless of the variant shape the caller declares.

### ClassPlugin

```ts
type ClassPlugin = Readonly<{
  pipeline: ClassPipelineFn
  ownedKeys?: OwnedPropKeys
}>
```

`pipeline` replaces the built-in class pipeline. `ownedKeys` is an optional `ReadonlySet<string>`
that declares which prop keys the plugin consumes. Framework adapters use this set to strip those
keys from the DOM or framework bindings automatically — callers never see them as unknown props and
they never reach the rendered element.

### OwnedPropKeys

```ts
type OwnedPropKeys = ReadonlySet<string>
```

A semantic alias for `ReadonlySet<string>`. The name carries intent: these are keys the plugin
_owns_, distinct from variant keys (which are also stripped but tracked separately via
`variantKeys`). The alias exists so ownership-related prop-key handling can be identified and
evolved independently.

### Runtime access

The instantiated plugin is stored on `PolymorphicRuntime.classPlugin`. Framework adapters read
`runtime.classPlugin?.ownedKeys` to build their prop-filter predicates.

---

## The children validation pipeline

`ChildrenEvaluator` orchestrates four collaborators. Call `evaluate(children)` with a pre-normalised
`unknown[]` (the React adapter handles `Children.toArray` + `isValidElement` filtering before this
point).

```txt
ChildrenEvaluator.evaluate(children)
  → RuleMatcher.match(children, rules)            → MatchMatrix
  → RuleValidator.validate(rules, matrix, n)      → cardinality + position checks
  → MatchValidator.validate(children, matrix)     → unexpected + ambiguous child checks
```

The pipeline intentionally separates:

- matching
- structural validation
- ambiguity analysis
- diagnostics reporting

This decomposition allows the validation engine to evolve independently without collapsing into
single-pass imperative traversal logic.

### RuleMatcher

Builds a `MatchMatrix` — a bidirectional map with two directions:

- **forward** (`child → rules`): used to detect children that matched no rule (unexpected) or
  matched more than one (ambiguous).
- **reverse** (`rule → children`): used to count how many children satisfied each rule for
  cardinality enforcement.

### RuleValidator

Iterates rules. For each rule, reads the reverse map to get a match count and checks:

- Cardinality bounds (`min` ≤ count ≤ `max` for bounded rules).
- Position constraint (`first` / `last` / `any`) against the matched child indices.

### MatchValidator

Iterates children. For each child, reads the forward map:

- No entry → unexpected child.
- `size === 1` → valid.
- `size > 1` → ambiguous (matched multiple rules).

All violations are batched into a single array before reporting so the caller sees the complete
picture in one throw rather than discovering failures one at a time.

### Cardinality

Represented as a discriminated union:

```ts
type Cardinality = { kind: 'bounded'; min: number; max: number } | { kind: 'unbounded' }
```

`normalizeChildRule` converts the author-facing `CardinalityInput` (`{ min?, max? }`) to this form.
`position='first'|'last'` silently sets `max=1` (the rule targets exactly one child by definition).
`ChildrenEvaluator` rejects `max > 1` on positional rules as a structural impossibility.

### Strict mode in validation

All four collaborators extend `StrictBase`. Violations call `violate()`, which throws in
`strict='throw'` mode, logs a warning in `'warn'` mode, and is silent when `false`.

---

## The ARIA policy engine

`AriaPolicyEngine` validates `(tag, props)` pairs against a set of ARIA rules and optionally
auto-corrects the props.

### Two-phase snapshot model

#### Evaluate phase

All rules run against the same frozen `(tag, props, implicitRole)` snapshot captured at the start of
`evaluate()`. This means every rule sees pre-fix state, so diagnostics accurately reflect the
original author intent rather than the result of earlier fixes.

#### Fix phase

Violations marked `fixable: true` carry an `AriaFix` with a `kind` and an `apply()` function. Fixes
are deduplicated by `FixKind` before running: at most one executor per kind fires regardless of how
many rules emitted it. Fixes run sequentially on the evolving props, but only if `hasRole` is still
true after each step.

The return value includes both the full `violations` array and the `props` object (potentially with
roles stripped). Callers receive both signals independently.

### Current rules

| Rule                                                                   | Severity | Fixable          |
| ---------------------------------------------------------------------- | -------- | ---------------- |
| `#checkInvalidRoleOverride` — strong implicit role + `role="region"`   | error    | yes (removeRole) |
| `#checkRedundantRole` — explicit role equals implicit role             | warning  | yes (removeRole) |
| `#checkStandaloneRegion` — standalone element assigned `role="region"` | error    | yes (removeRole) |

### Implicit role registry

`aria-role-policy.ts` maintains three structures:

- `implicitRoles` map — `tag → implicitRole` for the six landmark elements.
- `strongRoles` set — roles whose landmark semantics resist override with `role="region"`.
- `standaloneRoles` set — self-contained elements where `role="region"` is structurally incorrect
  regardless of implicit-role strength.

### Reporting

`report(violations)` routes by severity: `'error'` → `violate()`, `'warning'` → `warn()`. `warn()`
always caps at `console.warn` — it never throws even in `strict='throw'` mode, so redundant-role
warnings surface without aborting a render.

---

## StrictBase

All validation classes extend `StrictBase`. `StrictBase` acts as shared runtime diagnostics
infrastructure rather than a simple utility superclass.

It holds the `strict` field and exposes three protected methods:

| Method                 | `strict=true/'throw'`    | `strict='warn'`          | `strict=false` |
| ---------------------- | ------------------------ | ------------------------ | -------------- |
| `violate(msg)`         | throws `Error`           | `console.warn`           | silent         |
| `warn(msg)`            | `console.warn`           | `console.warn`           | silent         |
| `invariant(cond, msg)` | calls `violate` if false | calls `violate` if false | silent         |

The `warn`/`violate` split exists specifically for the ARIA engine: ARIA warnings should be visible
in strict environments but must not break a render.

`StrictBase` centralizes runtime error-policy behavior so all validation systems share identical
strictness semantics.

---

## Key design decisions

### Preset merging via CVA input, not class concatenation

Preset values are `Partial<VariantProps<V>>` objects merged _into_ the CVA call as:

```ts
{ ...preset, ...props }
```

This lets compound variant rules fire across the preset boundary and gives callers a clean override
mechanism (explicit props always win).

An alternative approach of concatenating pre-generated class strings was rejected because it
bypasses CVA entirely.

---

### Discriminated union cardinality over `{ min, max }` with `Infinity` sentinels

`kind: 'unbounded'` encodes unboundedness in the type rather than in a magic value, enabling
exhaustive switches and stronger invariant checks.

---

### Bidirectional match matrix

The children validation system uses forward + reverse maps rather than a single traversal list.

Each direction serves a different consumer:

- forward feeds child-level checks (unexpected / ambiguous)
- reverse feeds rule-level checks (cardinality / position)

Building both in one pass avoids additional traversal and keeps validation responsibilities
isolated.

---

### True LRU over FIFO in `VariantClassResolver`

A cache hit promotes the entry to most-recently-used so frequently accessed variant combinations
survive eviction even if they were added early.

This avoids cache churn under high-frequency rendering patterns.

---

### Runtime-first architecture over component-first architecture

The package is intentionally designed around a semantic runtime rather than around framework
components.

This enables:

- shared runtime semantics across frameworks
- centralized policy enforcement
- adapter-level rendering abstraction
