import type { ChildrenEvaluator, PolymorphicGenerics } from '@praxis-ui/core'
import type {
  BuiltChildrenEvaluator,
  SlotValidator,
  WithChildRules,
} from '@praxis-ui/adapter-utils'
import type { FilterPredicate } from './primitives'
import type { Runtime, TypedRuntime } from './runtime'

export type { WithChildRules, BuiltChildrenEvaluator }

export type BuiltRuntime<
  G extends PolymorphicGenerics = PolymorphicGenerics,
  TOptions extends WithChildRules = WithChildRules,
> = BuiltChildrenEvaluator<TOptions> & {
  runtime: TypedRuntime<G>
  filterProps: FilterPredicate
  slotValidator: SlotValidator
}

// Structural alias used when generic precision is not needed (e.g. as a prop type).
// Uses the structural Runtime supertype rather than TypedRuntime<any> — TypedRuntime<any>
// expands to require classPlugin (from the tailwind overload), breaking assignability.
// All BuiltRuntime<G, TOptions> variants satisfy this shape.
export type AnyBuiltRuntime = {
  runtime: Runtime
  filterProps: FilterPredicate
  slotValidator: SlotValidator
  childrenEvaluator?: ChildrenEvaluator
}
