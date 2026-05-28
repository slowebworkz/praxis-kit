// Render primitive layer — tag resolution, prop merge, utilities.
// No ARIA engine, no children validator, no styling runtime.
export { resolveTag, makeResolveTag } from '@praxis-ui/primitive'
export { mergeProps, cn, assertNever } from '@praxis-ui/primitive'
export { createPolymorphic } from './factory/create-polymorphic'
export type { ResolveTagFn } from './types'
export { isKnownAriaRole, hasRole, KNOWN_ARIA_ROLES } from './types/aria-role'
export type {
  AnyRecord,
  AriaRole,
  ClassName,
  DefaultProps,
  ElementType,
  IntrinsicProps,
  IntrinsicTag,
  KnownAriaRole,
  PropsWithRole,
} from './types'
