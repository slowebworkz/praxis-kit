import type { Backend, RuntimeContext } from '@pk2/core'

// Svelte components must be .svelte files (compile-time constraint). There is no
// runtime h() or createElement equivalent — Svelte's compiler emits fine-grained
// DOM instructions directly. The Backend<TOutput> model does not apply; rendering
// is handled by Polymorphic.svelte at compile time.
//
// This package is a structural placeholder. If the PK2 Svelte port ever needs a
// shared runtime hook, it will live here.
export const svelteBackend: Backend<never> = {
  render(_context: RuntimeContext): never {
    throw new Error(
      'svelteBackend: Svelte rendering is compile-time only. Use Polymorphic.svelte instead.',
    )
  },
}
