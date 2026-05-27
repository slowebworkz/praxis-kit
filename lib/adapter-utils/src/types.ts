import type { ChildrenEvaluator, EmptyRecord } from '@praxis-ui/core'

export type FilterPredicate = (key: string, variantKeys: ReadonlySet<string>) => boolean

// Constrained to only the field we care about — avoids deep FactoryOptions generic analysis
// (which exposes a VariantProps/exactOptionalPropertyTypes issue).
export type WithChildRules = { enforcement?: { children?: readonly unknown[] } }

// Absent entirely when no rules given — callers narrow with `'childrenEvaluator' in bundle`.
export type BuiltChildrenEvaluator<TOptions extends WithChildRules> = TOptions extends {
  enforcement: { children: readonly unknown[] }
}
  ? { childrenEvaluator: ChildrenEvaluator }
  : EmptyRecord
