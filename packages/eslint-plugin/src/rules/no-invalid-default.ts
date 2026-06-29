import { RuleCreator } from '@typescript-eslint/utils/eslint-utils'
import {
  asObjectExpression,
  asStringLiteral,
  extractVariantMap,
  getFirstObjectArg,
  getObjectProperty,
  getPropertyKey,
  isFactoryCall,
} from '../utils/ast'
import { iterate } from '@praxis-kit/primitive'

function formatAllowedValues(values: ReadonlySet<string>): string {
  return Array.from(values, (value) => `"${value}"`).join(', ')
}

const createRule = RuleCreator((name) => `https://praxis-kit.dev/eslint-rules/${name}`)

export type Options = [{ calleeNames?: string[]; reportNonLiteral?: boolean }]

export type MessageIds = 'unknownDefaultKey' | 'unknownDefaultValue' | 'nonLiteralValue'

export const noInvalidDefault = createRule<Options, MessageIds>({
  name: 'no-invalid-default',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow styling.defaults entries whose keys or values do not exist in styling.variants.',
    },
    messages: {
      unknownDefaultKey:
        '"{{ key }}" is not a variant defined in styling.variants. This default will have no effect.',
      unknownDefaultValue:
        '"{{ value }}" is not a valid value for variant "{{ key }}". Expected one of: {{ allowed }}. This default will have no effect.',
      nonLiteralValue:
        'Default value for "{{ key }}" is not a string literal and cannot be statically validated.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          calleeNames: { type: 'array', items: { type: 'string' } },
          reportNonLiteral: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const calleeNames = new Set(context.options[0]?.calleeNames ?? ['createContractComponent'])
    const reportNonLiteral = context.options[0]?.reportNonLiteral ?? false

    return {
      CallExpression(node) {
        if (!isFactoryCall(node, calleeNames)) return

        const arg = getFirstObjectArg(node)
        if (!arg) return

        const stylingProp = getObjectProperty(arg, 'styling')
        if (!stylingProp) return

        const styling = asObjectExpression(stylingProp.value)
        if (!styling) return

        const variantsProp = getObjectProperty(styling, 'variants')
        if (!variantsProp) return

        const variantMap = extractVariantMap(variantsProp.value)
        if (!variantMap || variantMap.size === 0) return

        const defaultsProp = getObjectProperty(styling, 'defaults')
        if (!defaultsProp) return

        const defaults = asObjectExpression(defaultsProp.value)
        if (!defaults) return

        iterate.forEach(defaults.properties, (prop) => {
          if (prop.type !== 'Property') return

          const key = getPropertyKey(prop)
          if (!key) return

          if (!variantMap.has(key)) {
            context.report({ node: prop, messageId: 'unknownDefaultKey', data: { key } })
            return
          }

          const value = asStringLiteral(prop.value)
          if (value === undefined) {
            if (reportNonLiteral) {
              context.report({ node: prop, messageId: 'nonLiteralValue', data: { key } })
            }
            return
          }

          const allowed = variantMap.get(key)!
          if (!allowed.has(value)) {
            context.report({
              node: prop,
              messageId: 'unknownDefaultValue',
              data: { key, value, allowed: formatAllowedValues(allowed) },
            })
          }
        })
      },
    }
  },
})
