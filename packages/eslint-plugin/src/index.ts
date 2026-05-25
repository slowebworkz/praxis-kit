import {
  noDeadCompound,
  noEnforcementWithoutStrict,
  noRedundantRole,
  validCardinality,
} from './rules'

const plugin = {
  meta: {
    name: '@polymorphic-ui/eslint-plugin',
    version: '1.0.0',
  },
  rules: {
    'no-dead-compound': noDeadCompound,
    'no-enforcement-without-strict': noEnforcementWithoutStrict,
    'no-redundant-role': noRedundantRole,
    'valid-cardinality': validCardinality,
  },
  configs: {},
} as const

// Recommended config — all rules at their default severity.
const recommended = {
  name: '@polymorphic-ui/recommended',
  plugins: { '@polymorphic-ui': plugin },
  rules: {
    '@polymorphic-ui/no-dead-compound': 'error',
    '@polymorphic-ui/no-enforcement-without-strict': 'error',
    '@polymorphic-ui/no-redundant-role': 'warn',
    '@polymorphic-ui/valid-cardinality': 'error',
  },
} as const

// Assign after construction so the reference is complete.
;(plugin.configs as Record<string, unknown>)['recommended'] = recommended

export default plugin
export { plugin, recommended }
export {
  noDeadCompound,
  noEnforcementWithoutStrict,
  noRedundantRole,
  validCardinality,
} from './rules'
