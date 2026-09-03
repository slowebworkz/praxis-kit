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
}
