import {
  noDeadCompound,
  noEnforcementWithoutStrict,
  noInvalidDefault,
  noRedundantRole,
  validCardinality,
  validChildrenConfig,
} from './rules'

const plugin = {
  meta: {
    name: '@praxis-ui/eslint-plugin',
    version: '1.0.0',
  },
  rules: {
    'no-dead-compound': noDeadCompound,
    'no-enforcement-without-strict': noEnforcementWithoutStrict,
    'no-invalid-default': noInvalidDefault,
    'no-redundant-role': noRedundantRole,
    'valid-cardinality': validCardinality,
    'valid-children-config': validChildrenConfig,
  },
  configs: {},
} as const

// Recommended config — all rules at their default severity.
const recommended = {
  name: '@praxis-ui/recommended',
  plugins: { '@praxis-ui': plugin },
  rules: {
    '@praxis-ui/no-dead-compound': 'error',
    '@praxis-ui/no-enforcement-without-strict': 'error',
    '@praxis-ui/no-invalid-default': 'error',
    '@praxis-ui/no-redundant-role': 'warn',
    '@praxis-ui/valid-cardinality': 'error',
    '@praxis-ui/valid-children-config': 'error',
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
  noRedundantRole,
  validCardinality,
  validChildrenConfig,
} from './rules'
