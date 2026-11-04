import type { AnyRecord } from '@praxis-kit/core'
import type { ChildSpec } from './child-spec'
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
  /**
   * `children` is optional and only used by the `asChild` scenarios: describe the child tree with
   * the same framework-neutral `ChildSpec` the DOM suite uses and convert it to the framework's
   * own nodes. Adapters that opt out of `asChild` (below) can ignore it.
   */
  renderToString(component: C, props?: AnyRecord, children?: ChildSpec[]): string | Promise<string>
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
    /**
     * false for adapters with no `asChild` concept at all for `compose` to compose into (Lit,
     * Web). Defaults to true — `compose`'s SSR path needs no `asChild`-specific adapter support
     * beyond `createComponent`/`renderToString`, which every registered adapter already has.
     */
    compose?: boolean
    /**
     * false for adapters whose `asChild` is not the plain "render my single child element with my
     * props" model the suite describes with `ChildSpec` -- Solid and Svelte (render-function /
     * snippet children), Lit and Web (no `asChild` concept at all). Defaults to true, matching the
     * DOM suite's `capabilities.asChild`. Skips the SSR `asChild` scenarios.
     */
    asChild?: boolean
  }
}
