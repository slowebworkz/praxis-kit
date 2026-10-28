import { AriaPolicyEngine } from '@praxis-kit/contract'
import { isFalse, isUndefined } from '@praxis-kit/guards'
import type {
  AriaPipelineResult,
  AriaRule,
  BuiltinHtmlRuleId,
  ElementType,
  IntrinsicProps,
  RenderPipeline,
  ResolvedFactoryShape,
  RuleOverride,
} from '../../types'
import { HTML_ARIA_RULES } from '../../html'

// ARIA enforcement is policy construction, not generic pipeline plumbing — it owns the
// always-on HTML rule set, a caller's extra `ariaRules`, and the AriaPolicyEngine instance that
// evaluates them. Kept separate from ./pipelines so createPolymorphic doesn't need to know how
// enforcement is built, only whether to install it.

function withRuleOverride(rule: AriaRule, override: Exclude<RuleOverride, false>): AriaRule {
  return Object.assign(
    (context: Parameters<AriaRule>[0]) =>
      rule(context).map((result) => {
        if (result.valid) return result
        const diagnostic = result.diagnostic
        return {
          ...result,
          ...(!isUndefined(override.severity) && { severity: override.severity }),
          ...(!isUndefined(override.message) && {
            message: override.message,
            ...(!isUndefined(diagnostic) && {
              diagnostic: { ...diagnostic, message: override.message },
            }),
          }),
        }
      }),
    { id: rule.id, readsProps: rule.readsProps, tags: rule.tags },
  ) as AriaRule
}

function resolveAriaRules(resolved: ResolvedFactoryShape): readonly AriaRule[] {
  const overrides = resolved.ruleOverrides
  const builtinRules = HTML_ARIA_RULES.flatMap((rule) => {
    const { id } = rule
    const override = isUndefined(id) ? undefined : overrides?.[id as BuiltinHtmlRuleId]
    if (isUndefined(override)) return [rule]
    if (isFalse(override)) return []
    return [withRuleOverride(rule, override)]
  })
  return [...new Set<AriaRule>([...builtinRules, ...(resolved.ariaRules ?? [])])]
}

export const createAriaPipeline: RenderPipeline<
  [ElementType, IntrinsicProps, IntrinsicProps?],
  AriaPipelineResult
> = (resolved) => {
  const rules = resolveAriaRules(resolved)
  const engine = new AriaPolicyEngine(resolved.diagnostics, {
    ...(rules.length > 0 && { rules }),
    variantKeys: resolved.variantKeys,
  })
  return (tag, props, extraProps) => engine.validate(tag, props, extraProps)
}

// Used in place of createAriaPipeline's result when a component has no `enforcement` option
// configured at all — a no-op that echoes props back unchanged, keeping resolveAria's shape
// uniform regardless of whether enforcement is active.
export function resolveAriaPassthrough<P extends IntrinsicProps>(
  _tag: ElementType,
  props: P,
  _extraProps?: IntrinsicProps,
) {
  return { props }
}
