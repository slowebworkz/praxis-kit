import type { AnyRecord, ClassName, ClassPlugin, ElementType } from '@praxis-kit/primitive'

/**
 * Computes the final CSS class string for a rendered element.
 *
 * A class pipeline receives the resolved rendering context and returns the
 * complete class string to apply to the element.
 *
 * The returned class string may combine:
 *
 * - base classes,
 * - tag-specific classes,
 * - variant-derived classes,
 * - recipe-derived classes, and
 * - caller-supplied classes.
 *
 * If provided, `recipe` selects a named preset before applying any
 * prop-derived variant overrides.
 */
export type ClassPipelineFn = (
  tag: unknown,
  props: AnyRecord,
  className?: ClassName,
  recipe?: string,
) => string | undefined

/** Argument tuple for a resolved class pipeline call: rendered tag, merged props, optional
 *  caller class override, optional preset key. */
export type ClassPipelineArgs = [
  tag: ElementType,
  props: AnyRecord,
  className: ClassName | undefined,
  recipe: string | undefined,
]

/**
 * Configuration types used to build class pipelines.
 */
export type {
  BaseClassOptions,
  ClassPipelineOptions,
  CompositionOptions,
  CVASystemOptions,
  RecipeOptions,
  RecipeTarget,
  StyleOptions,
  TagMapOptions,
  CompoundVariant,
  CVACompounds,
  CVAConfig,
  CVADefaults,
  CVAVariants,
} from '@praxis-kit/primitive'

export type {
  AnyClassPluginFactory,
  ClassPlugin,
  ClassPluginFactory,
  ExtractPluginProps,
  OwnedPropKeys,
  PluginInstance,
} from '@praxis-kit/primitive'

/** `ClassPlugin` with its plugin-owned-props generic erased — the resolved-instance
 *  counterpart to `AnyClassPluginFactory`. */
export type AnyClassPlugin = ClassPlugin<AnyRecord> | undefined
