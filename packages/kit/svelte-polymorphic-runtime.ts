/**
 * Internal runtime + type surface for `dist/svelte/Polymorphic.svelte`.
 *
 * `Polymorphic.svelte` ships into `dist/svelte/` as **raw source** — the consumer's own Svelte
 * compiler processes it at their build time (see `scripts/postbuild.ts` → `copyPolymorphicSvelte`).
 * Its `<script>` block imports helpers from `@praxis-kit/core` / `@praxis-kit/primitive` /
 * `@praxis-kit/adapter-utils` and types from `./types` — all workspace-internal (`private: true`)
 * modules that are never published, so those specifiers cannot resolve in a consumer project.
 *
 * This module re-exports the runtime helpers (and the two structural type aliases) that block
 * imports from `@praxis-kit/core` / `@praxis-kit/primitive` / `@praxis-kit/adapter-utils`.
 * `postbuild.ts` rewrites those three specifiers in the copied `.svelte` to
 * `./_polymorphic-runtime.js` (this file, built as a bundled `svelte/_polymorphic-runtime`
 * entry — not a public subpath, reachable only by relative path from the sibling `.svelte`, the
 * same pattern as `_shared/diagnostics`).
 *
 * The component's `./types` import is rewritten separately, to `./index.js` — the real
 * `praxis-kit/svelte` entry already re-exports `PolymorphicComponentProps`, `ResolvedAttributes`,
 * `StyleObject` and `UnknownProps`, and routing through it keeps `bundle`'s runtime types
 * (`SlotValidator`, `ChildrenEvaluator` — nominal, private members) as the *same* declarations a
 * consumer's `createContractComponent` bundle produces, so `<Polymorphic bundle={…}>` still
 * type-checks.
 *
 * Keep this in sync with the `import` list in `adapters/svelte/src/Polymorphic.svelte`.
 */

export { enforceAllowedAs, isKnownAriaRole } from '@praxis-kit/core'
export { isObject, isString } from '@praxis-kit/primitive'
export { applyFilter, resolveNormalizedProps } from '@praxis-kit/adapter-utils'

// Structural aliases (`ElementType` is a string union; `IntrinsicProps` is `AnyRecord & {…}`) —
// safe to carry as a bundled copy, unlike the runtime types above.
export type { ElementType, IntrinsicProps } from '@praxis-kit/core'
