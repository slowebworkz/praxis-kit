/**
 * The three render modes a praxis-kit component's props can be typed for, shared across every
 * adapter that has more than one — not every adapter supports all three (e.g. Preact has no
 * `'render'` mode), but the union itself stays one canonical type here rather than each adapter
 * redeclaring its own (partial, drift-prone) copy.
 *
 * - `'normal'` — the default render mode; `as` selects the host/intrinsic element.
 * - `'asChild'` — slot rendering: props merge onto a child element instead of a host element.
 * - `'render'` — a render callback receives the fully-resolved props and renders anything.
 *
 * Location note: this is the only canonical definition in the repo, and today only the
 * overloaded-callable adapters (React, Preact) consume it — hence its home here alongside
 * `HasGenerics`/`PickMode`. It is really a *render-protocol* concept, though; if `lib/primitive`'s
 * slot protocol or `packages/core` ends up needing it, hoist it there so it is not gated behind
 * this (React/Preact-specific) package. Tracked in `.vscode/MIGRATION.md`.
 */
export type Mode = 'normal' | 'asChild' | 'render'
