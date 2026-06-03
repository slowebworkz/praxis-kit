import type { AriaRole } from './aria-role'
import type { ClassName, IntrinsicTag } from '@praxis-ui/shared/types'

export type {
  AnyRecord,
  ClassName,
  DefaultProps,
  ElementType,
  EmptyRecord,
  IntrinsicTag,
} from '@praxis-ui/shared/types'

export type { AriaRole, KnownAriaRole } from './aria-role'

/**
 * Props for an intrinsic HTML element. `role` is explicitly typed as the
 * only known key; all other props remain open via the index signature.
 */
export type IntrinsicProps = Record<string, unknown> & { role?: AriaRole }

/**
 * Narrowed form of `IntrinsicProps` after a `hasRole` check — guarantees
 * `role` is a non-empty string. Used as the pipeline entry condition.
 * Shallow-readonly so callers cannot mutate props passed into the engine.
 */
export type PropsWithRole = Readonly<IntrinsicProps & { role: string }>

/**
 * Maps rendered HTML tag names to additional CSS class strings.
 *
 * When a component renders as a tag that matches a key, the mapped class is
 * appended after the base class. Values are CSS classes, not tag names.
 * Accepts both known intrinsic tags and arbitrary string keys.
 */
export type TagMap = Partial<Record<IntrinsicTag | (string & {}), ClassName>>
