import type { LayoutProps, ResolvedLayout } from './layout'
import type { ClassifiedToken } from './classified-token'
import type { layoutKeys } from '../layout-keys'
import type { LayoutState } from '../layout-state'
import type { AnyRecord, ClassName } from '@praxis-kit/primitive'

type PipelineLayoutProps = LayoutProps<typeof layoutKeys>
type PipelineLayout = ResolvedLayout<typeof layoutKeys>
type PipelineProps = PipelineLayoutProps & AnyRecord

// Shared pipeline inputs carried unchanged from the public entry point into the
// internal pipeline context. Centralizing them keeps both APIs in sync.
interface PipelineInputs {
  readonly props: PipelineProps
  readonly recipe: string | undefined
}

// The resolved layout and its associated runtime state.
interface PipelineResolution {
  readonly mode: PipelineLayout
  readonly state: LayoutState
}

// Token collections produced during classification.
//
// The property references are immutable, but the arrays remain mutable so they
// can be passed to helpers that operate on `ClassifiedToken[]`. These arrays
// are owned exclusively by a single pipeline invocation.
interface PipelineTokens {
  readonly filtered: ClassifiedToken[]
  readonly tokens: ClassifiedToken[]
}

// Mirrors the public `ClassPipelineFn` signature exactly.
//
// Function parameters are checked contravariantly, so narrowing a parameter
// type (for example, `tag: ElementType`) would make the composed pipeline
// incompatible with `ClassPipelineFn`, which accepts `tag: unknown`.
export type TailwindPipelineArgs = [
  tag: unknown,
  props: PipelineInputs['props'],
  className: ClassName | undefined,
  recipe: PipelineInputs['recipe'],
]

export interface TailwindPipelineContext
  extends PipelineInputs, PipelineResolution, PipelineTokens {}
