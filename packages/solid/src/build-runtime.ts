import type {
  AriaRule,
  ChildRuleInput,
  DefaultOf,
  ElementType,
  PolymorphicGenerics,
  PresetMap,
  PresetOf,
  PropsOf,
  StrictMode,
  VariantMap,
  VariantsOf,
} from '@polymorphic-ui/core'
import { AriaPolicyEngine, ChildrenEvaluator, createPolymorphic } from '@polymorphic-ui/core'
import { composeFilter } from './compose-filter'
import type { SolidFactoryOptions } from './solid-options'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { NormalizedOptions } from './types/normalized-options'
import type { UnknownProps } from './types'

function normalizeOptions<G extends PolymorphicGenerics>(
  options: SolidFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>,
): NormalizedOptions<G> {
  return {
    ...options,
    name: options.name ?? 'PolymorphicComponent',
    enforcement: {
      ...options.enforcement,
      strict: options.enforcement?.strict ?? 'throw',
    },
  } as NormalizedOptions<G>
}

function buildCoreRuntime<G extends PolymorphicGenerics>(normalized: NormalizedOptions<G>) {
  const runtime = createPolymorphic(normalized)
  const ownedKeys = 'classPlugin' in runtime ? runtime.classPlugin.ownedKeys : undefined
  return { runtime, ownedKeys }
}

function buildValidators(
  strict: StrictMode,
  childRules?: readonly ChildRuleInput[],
  ariaRules?: readonly AriaRule[],
) {
  const ariaEngine = new AriaPolicyEngine(
    strict,
    ariaRules?.length ? { rules: ariaRules } : undefined,
  )
  const childrenEvaluator = childRules?.length
    ? new ChildrenEvaluator(childRules, strict)
    : undefined
  return { ariaEngine, childrenEvaluator }
}

export type { BuiltRuntime }

export function buildRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants>,
  TOptions extends WithChildRules,
>(
  options: SolidFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions,
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset>, TOptions> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
  const normalized = normalizeOptions<G>(options)
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)
  const { ariaEngine, childrenEvaluator } = buildValidators(
    normalized.enforcement.strict,
    normalized.enforcement?.children,
    normalized.enforcement?.aria,
  )
  const filterProps = composeFilter(ownedKeys, normalized.filterProps)

  return {
    runtime,
    ariaEngine,
    filterProps,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  } as BuiltRuntime<G, TOptions>
}
