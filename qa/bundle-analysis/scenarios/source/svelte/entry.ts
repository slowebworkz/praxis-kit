/**
 * Full-entry composition scenario for `@praxis-kit/svelte`. Only the JS entry (`index.ts`) —
 * `Polymorphic.svelte` is raw `.svelte` source consumed by the *consumer's* own Svelte compiler,
 * never bundled by this workspace's own tooling, so it has no JS-level composition to measure.
 */
export * from '@praxis-kit/svelte'
