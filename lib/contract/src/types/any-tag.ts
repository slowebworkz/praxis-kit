import type { ElementType } from '@praxis-kit/primitive'

// Broader than ElementType: accepts component functions so adapters can pass the `as` prop directly.
export type AnyTag = ElementType | ((...args: unknown[]) => unknown)
