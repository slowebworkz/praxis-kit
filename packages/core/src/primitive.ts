// Render primitive layer — tag resolution, prop merge, utilities. No ARIA engine, no children
// validator, no styling runtime. Cross-workspace surfaces are re-exported whole (`export *`) so a
// rename or addition in the source package can't silently drop out of this entry; only the
// same-package `./types` names are listed.
export * from '@praxis-kit/primitive/tag'
export * from '@praxis-kit/primitive/utils'
export * from '@praxis-kit/contract/aria/roles'

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
  ResolveTagFn,
} from './types'
