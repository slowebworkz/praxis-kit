import type { AnyRecord } from '@praxis-kit/core'
import type { ConformanceComponent } from './conformance-component'
import type { ConformanceFactoryOptions } from './conformance-factory-options'

/**
 * Adapter contract for the SSR conformance suite (`ssrConformanceSuite`).
 *
 * Implement in a `// @vitest-environment node` test file — SSR must not access browser globals
 * (window, document, etc.).
 *
 * `C` is the framework's component type. `renderToString` may return a string synchronously or a
 * `Promise<string>` for async renderers (e.g. Vue).
 */
export type SsrConformanceAdapter<C extends ConformanceComponent = ConformanceComponent> = {
  createComponent(options: ConformanceFactoryOptions): C
  renderToString(component: C, props?: AnyRecord): string | Promise<string>
  /**
   * Declare which optional behavioral contracts this adapter's SSR path satisfies. Mirrors
   * `ConformanceAdapter.capabilities` (`./conformance-adapter`) — kept as its own, narrower field
   * here rather than sharing that type directly, since the DOM suite's `asChild`/`domPropFiltering`
   * capabilities have no SSR-path equivalent to gate.
   */
  capabilities?: {
    /**
     * false for adapters where the rendered element tag is fixed at registration time (e.g. Lit
     * custom elements) — the same constraint `ConformanceAdapter.capabilities.tagPolymorphism`
     * documents for the DOM suite, but SSR has no live element to constrain it the way the DOM
     * path does: without this gate, an SSR-only adapter could render whatever tag `as` names as a
     * literal string wrapper even though the real component can never structurally become that
     * tag, producing markup the live client would never itself produce. Skips the SSR test
     * asserting `as` changes the rendered tag.
     */
    tagPolymorphism?: boolean
  }
}
