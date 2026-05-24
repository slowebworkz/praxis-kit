// Render primitive layer — tag resolution, prop merge, utilities.
// No ARIA engine, no children validator, no styling runtime.
export { resolveTag, makeResolveTag } from '@polymorphic-ui/primitive'
export { mergeProps, cn, assertNever } from '@polymorphic-ui/primitive'
export type { ResolveTagFn } from './types'
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
