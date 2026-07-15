import type { LayoutMode, LayoutProps } from './layout'
import type { ClassifiedToken } from './classified-token'
import type { layoutKeys } from '../layout-keys'
import type { LayoutState } from '../layout-state'
import type { AnyRecord, ClassName } from '@praxis-kit/primitive'

// Fields carried unchanged from the original pipeline call through to
// TailwindPipelineContext — factored out so the two types can't drift apart.
interface TailwindPipelineCallFields {
  readonly props: LayoutProps<typeof layoutKeys> & AnyRecord
  readonly recipe: string | undefined
}

// Mirrors ClassPipelineFn's exact parameter types (tag: unknown, className/recipe
// required-but-possibly-undefined) rather than reusing @praxis-kit/core's
// ClassPipelineArgs (which types tag as ElementType) — pipeline: ClassPipelineFn
// is a property, so TypeScript checks it contravariantly, and a narrower `tag`
// type here would make the composed pipeline unassignable to that field.
export type TailwindPipelineArgs = [
  tag: unknown,
  props: TailwindPipelineCallFields['props'],
  className: ClassName | undefined,
  recipe: TailwindPipelineCallFields['recipe'],
]

export interface TailwindPipelineContext extends TailwindPipelineCallFields {
  readonly mode: LayoutMode<typeof layoutKeys>
  readonly state: LayoutState
  // Not marked readonly: ClassBuilder.build / warnReservedLayoutLiterals take
  // mutable ClassifiedToken[] params, and these arrays are freshly allocated
  // per render (from classifyTokens/Array#filter), so mutability is moot.
  readonly filtered: ClassifiedToken[]
  readonly tokens: ClassifiedToken[]
}
