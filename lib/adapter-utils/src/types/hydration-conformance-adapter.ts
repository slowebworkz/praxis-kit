import type { AnyRecord } from '@praxis-kit/core'
import type { ConformanceComponent } from './conformance-component'
import type { ConformanceFactoryOptions } from './conformance-factory-options'

/**
 * Adapter contract for the hydration parity suite (`hydrationParitySuite`).
 *
 * Both `renderToString` and `renderToDOM` must be provided so the suite can compare
 * server-rendered HTML against client-rendered DOM attributes.
 *
 * Run in a `// @vitest-environment jsdom` test file — DOM access is required to mount the client
 * render and read attributes.
 */
export type HydrationConformanceAdapter<C extends ConformanceComponent = ConformanceComponent> = {
  createComponent(options: ConformanceFactoryOptions): C
  /** Returns an HTML string (server render). May be async (e.g. Vue). */
  renderToString(component: C, props?: AnyRecord): string | Promise<string>
  /** Mounts the component and returns the root DOM element (client render). */
  renderToDOM(component: C, props?: AnyRecord): HTMLElement | Promise<HTMLElement>
  /** Called before each test to set up any DOM container. */
  setup(): void
  /** Called after each test to tear down the DOM container. */
  cleanup(): void
}
