import type { LitElement } from 'lit'

/**
 * Handle returned by createComponent in the conformance adapter.
 * Carries the registered custom element name so render() can instantiate it.
 */
export type LitConformanceComponent = {
  displayName?: string
  elementName: string
}

/**
 * Minimal LitElement surface used by the conformance adapter.
 * performUpdate() forces the scheduled microtask update to run synchronously —
 * required because conformanceSuite() tests are fully synchronous and cannot
 * await updateComplete. This is the public API on ReactiveElement (Lit 3+).
 */
export type LitConformanceEl = LitElement & {
  performUpdate(): void
}
