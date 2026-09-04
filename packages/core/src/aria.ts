// The ARIA-rule authoring surface: the fix factories and the rule/result types a consumer needs
// to write a custom `enforcement.aria` rule. Built-in rules (`HTML_ARIA_RULES` and friends) are on
// the `@praxis-kit/core` root / `./contract` entry — this is only what you compose *with*.
export * from '@praxis-kit/contract/aria/factories'
export type * from '@praxis-kit/contract/types/aria/aria-rule'
