import type { JSX } from 'solid-js'
import type { Backend, RuntimeContext } from '@pk2/core'

// Solid's rendering model is fundamentally reactive — JSX compiles to fine-grained
// DOM updates via signals, not a VNode tree. The Backend<TOutput> interface maps
// naturally to Preact/Vue/React but requires a different integration strategy here:
// the Solid adapter assembles props reactively at call time rather than walking a
// static tree post-render.
//
// This backend is a placeholder. The actual Solid PK2 integration will not use
// renderComponent/Backend directly — it will assemble JSX.Element from the
// decoration record inline in the component function, using Dynamic from solid-js/web.
export const solidBackend: Backend<JSX.Element> = {
  render(_context: RuntimeContext): JSX.Element {
    throw new Error(
      'solidBackend: Solid uses fine-grained reactivity — use Dynamic and inline prop assembly instead of renderComponent.',
    )
  },
}
