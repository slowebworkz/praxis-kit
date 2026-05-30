import type { AnyRecord, StrictMode } from '@praxis-ui/core'

// Component returned by createComponent — must carry displayName.
export type ConformanceComponent = { displayName?: string }

// Mutable ref object — same shape as React.createRef / Preact.createRef.
export type ConformanceRef = { current: HTMLElement | null }

export type ChildSpec =
  | { tag: string; props?: AnyRecord; children?: ChildSpec[] }
  | { component: ConformanceComponent; props?: AnyRecord; children?: ChildSpec[] }

export type RenderResult = {
  /** The current root DOM element. Always reflects the latest render/rerender. */
  readonly element: HTMLElement
  /** Re-render the same component with new props and/or children. */
  rerender(props?: AnyRecord, children?: ChildSpec[]): void
  /** Unmount the component from the DOM. */
  unmount(): void
}

export type ConformanceFactoryOptions = {
  tag?: string
  name?: string
  styling?: {
    base?: string
    variants?: Record<string, Record<string, string>>
    defaults?: Record<string, string>
    compounds?: ReadonlyArray<Record<string, string> & { class: string }>
    presets?: AnyRecord
  }
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
  enforcement?: {
    strict?: StrictMode
    children?: ReadonlyArray<{
      name: string
      match: (c: unknown) => c is unknown
      cardinality?: { min?: number; max?: number }
    }>
  }
}

/**
 * Adapter contract for the conformance suite.
 *
 * Implement for each framework adapter (React/Preact/Vue) to verify that
 * createContractComponent honours the shared behavioral contracts.
 *
 * Notes on framework-specific limitations:
 *   Solid  — asChild uses a render-function pattern (children must be
 *             `(props) => element`), incompatible with ChildSpec. Set
 *             `capabilities.asChild: false` and wire Solid-specific asChild
 *             tests in the adapter directly.
 *   Svelte — createContractComponent returns a BuiltRuntime bundle, not a
 *             component, and children are Svelte snippets. Wire Svelte tests
 *             directly against Polymorphic.svelte.
 */
export type ConformanceAdapter = {
  createComponent(options: ConformanceFactoryOptions): ConformanceComponent
  render(component: ConformanceComponent, props?: AnyRecord, children?: ChildSpec[]): RenderResult
  setup(): void
  cleanup(): void
  /**
   * Optional: provide to enable ref-forwarding tests.
   * Return a mutable `{ current: null }` object populated after render
   * (e.g. React.createRef / Preact.createRef).
   */
  createRef?(): ConformanceRef
  /**
   * Declare which optional contracts this adapter satisfies.
   * Unset fields default to true — only set false to opt out.
   */
  capabilities?: {
    /** false for Solid, which uses a render-function asChild pattern. */
    asChild?: boolean
  }
}
