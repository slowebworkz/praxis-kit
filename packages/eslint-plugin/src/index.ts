import type { ESLint } from 'eslint'
import {
  noDeadCompound,
  noEnforcementWithoutStrict,
  noInvalidDefault,
  noInvalidHtmlNesting,
  noRedundantRole,
  validCardinality,
  validChildrenConfig,
} from './rules'

const plugin = {
  meta: {
    name: '@praxis-kit/eslint-plugin',
    version: '1.0.0',
  },
  rules: {
    'no-dead-compound': noDeadCompound,
    'no-enforcement-without-strict': noEnforcementWithoutStrict,
    'no-invalid-default': noInvalidDefault,
    'no-invalid-html-nesting': noInvalidHtmlNesting,
    'no-redundant-role': noRedundantRole,
    'valid-cardinality': validCardinality,
    'valid-children-config': validChildrenConfig,
  } as unknown as ESLint.Plugin['rules'],
  configs: {},
} satisfies ESLint.Plugin

// Recommended config — all rules at their default severity.
const recommended = {
  name: '@praxis-kit/recommended',
  plugins: { '@praxis-kit': plugin },
  rules: {
    '@praxis-kit/no-dead-compound': 'error',
    '@praxis-kit/no-enforcement-without-strict': 'error',
    '@praxis-kit/no-invalid-default': 'error',
    '@praxis-kit/no-invalid-html-nesting': 'error',
    '@praxis-kit/no-redundant-role': 'warn',
    '@praxis-kit/valid-cardinality': 'error',
    '@praxis-kit/valid-children-config': 'error',
  },
} as const

// Assign after construction so the reference is complete.
;(plugin.configs as Record<string, unknown>)['recommended'] = recommended

export default plugin
export { plugin, recommended }
export {
  noDeadCompound,
  noEnforcementWithoutStrict,
  noInvalidDefault,
  noInvalidHtmlNesting,
  noRedundantRole,
  validCardinality,
  validChildrenConfig,
} from './rules'
