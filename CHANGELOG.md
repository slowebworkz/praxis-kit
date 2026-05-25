# Changelog

## v1.0.0 — Architectural Launch

This is not an incremental release. v1.0.0 is a complete architectural rewrite that replaces the
monolithic core package with a layered, capability-driven runtime. The public API is intentionally
backward-compatible for common usage; the internal structure is wholly new.

### What changed

**Layered lib/ runtime**

The monolithic `packages/core` is now backed by three private library packages:

| Package                     | Role                                                     |
| --------------------------- | -------------------------------------------------------- |
| `@polymorphic-ui/primitive` | Tag resolution, prop merging, base types                 |
| `@polymorphic-ui/contract`  | ARIA policy engine, children evaluator, strict-mode base |
| `@polymorphic-ui/styling`   | CVA wrapper, class pipeline, variant resolver            |

These packages are private (`lib/`). `packages/core` is still the single import point for consumers;
the lib/ split is an implementation boundary, not a new surface.

**Capability-driven factory**

The ARIA policy engine is no longer instantiated unconditionally. A component only pays for the
engine if it declares `enforcement` in its factory options. A pure styling component has zero ARIA
overhead at runtime.

```ts
// No ARIA engine — zero enforcement cost
createPolymorphic({ styling: { base: 'btn', variants } })

// ARIA engine active — capabilities opt in
createPolymorphic({
  styling: { base: 'link', tagMap: { button: 'link--button' } },
  enforcement: { strict: 'warn', aria: [...rules] },
})
```

**Shared adapter infrastructure (`lib/adapter-utils`)**

All six framework adapters (React, Vue, Tailwind, Preact, Solid, Svelte) now share a common
`lib/adapter-utils` package for runtime construction and prop filtering. Per-framework code is
reduced to render mechanics and lifecycle integration only.

**Class pipeline diagnostics**

A new `diagnoseClassPipeline` function exposes the full resolution trace: base class, tag-map
(applied or bypassed), preset values, effective variants, and per-compound-variant match/mismatch
detail. Intended for debugging, not production rendering.

**Type system hardening**

- `EmptyRecord = Record<never, never>` — replaces 25+ inline occurrences of the empty record pattern
  used as generic defaults across all adapter signatures.
- `VariantConditionValue = string | boolean | ReadonlyArray<string | boolean>` — narrows
  `CompoundTrace.conditions` from `AnyRecord` to the actual domain of compound variant condition
  values.
- `AnyRecord` and `UnknownProps` are used consistently throughout; raw `Record<string, unknown>` no
  longer appears at API boundaries.

**Framework adapter coverage**

| Adapter                    | Strategy                                                          |
| -------------------------- | ----------------------------------------------------------------- |
| `@polymorphic-ui/react`    | React 19 (`current/`) + React 18 (`legacy/`) ref split            |
| `@polymorphic-ui/vue`      | `defineComponent`, `h()`, `cloneVNode` slot protocol              |
| `@polymorphic-ui/tailwind` | Layout-aware class pipeline plugin                                |
| `@polymorphic-ui/preact`   | `forwardRef` from `preact/compat`                                 |
| `@polymorphic-ui/solid`    | Client + SSR (separate vitest configs)                            |
| `@polymorphic-ui/svelte`   | Returns a `BuiltRuntime` bundle; renders via `Polymorphic.svelte` |

### Migration

See [MIGRATING.md](./MIGRATING.md) for upgrade paths from CVA, Radix Slot, and Chakra UI. The
[ARCHITECTURE.md](./ARCHITECTURE.md) documents the full runtime model including debugging guidance.

### Git history

The v1.0.0 history is a clean linear rebase of the rewrite branch onto main:

```
87655cc  chore(workspace): monorepo scaffold
5d91787  feat(lib): add runtime foundation — primitive, contract, styling
d0d5f98  feat(architecture): capability-driven factory — lib/ modules, adapter-utils, ARIA gating
985b453  feat(quality): integration tests, build hardening, class diagnostics, type aliases
```

The previous architecture is preserved at the `v0-legacy` tag for reference.

---

## v0 — Legacy

See `git log v0-legacy` for the full history of the original monolithic architecture. Not actively
maintained.
