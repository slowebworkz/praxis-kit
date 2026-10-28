import type { BUILTIN_HTML_RULE_IDS } from '../../constants'

/** Identifier of a built-in HTML rule — the keys `enforcement.ruleOverrides` accepts. */
export type BuiltinHtmlRuleId = (typeof BUILTIN_HTML_RULE_IDS)[number]

/** `false` disables the rule; an object replaces its severity and/or message. */
export type RuleOverride =
  | false
  | { readonly severity?: 'error' | 'warning'; readonly message?: string }

export type RuleOverrides = Readonly<Partial<Record<BuiltinHtmlRuleId, RuleOverride>>>
