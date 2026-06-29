import { RuleCreator } from '@typescript-eslint/utils/eslint-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import {
  asObjectExpression,
  asArrayExpression,
  asStringLiteral,
  extractVariantMap,
  getFirstObjectArg,
  getObjectProperty,
  getPropertyKey,
  isFactoryCall,
} from '../utils/ast'
import { iterate } from '@praxis-kit/primitive'

type Property = TSESTree.Property

const createRule = RuleCreator((name) => `https://praxis-kit.dev/eslint-rules/${name}`)

export type Options = [{ calleeNames?: string[]; reportNonLiteral?: boolean }]

export type MessageIds = 'unknownVariantKey' | 'unknownVariantValue' | 'nonLiteralValue'

export const noDeadCompound = createRule<Options, MessageIds>({
  name: 'no-dead-compound',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow compound variant conditions that reference unknown variant keys or values — compounds that can never fire.',
    },
    messages: {
      unknownVariantKey:
        '"{{ key }}" is not a variant defined in styling.variants. This compound condition can never match.',
      unknownVariantValue:
        '"{{ value }}" is not a valid value for variant "{{ key }}". Expected one of: {{ allowed }}. This compound condition can never match.',
      nonLiteralValue:
        'Compound value for "{{ key }}" is not a string literal and cannot be statically validated.',
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

        const compoundsProp = getObjectProperty(styling, 'compounds')
        if (!compoundsProp) return

        const compounds = asArrayExpression(compoundsProp.value)
        if (!compounds) return

        iterate.forEach(compounds.elements, (element) => {
          if (!element || element.type !== 'ObjectExpression') return

          iterate.forEach(element.properties, (prop) => {
            if (prop.type !== 'Property') return

            const literalProp = prop as Property

            const key = getPropertyKey(literalProp)
            if (!key || key === 'class' || key === 'className') return

            if (!variantMap.has(key)) {
              context.report({
                node: prop,
                messageId: 'unknownVariantKey',
                data: { key },
              })
              return
            }

            const value = asStringLiteral(literalProp.value)
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
                messageId: 'unknownVariantValue',
                data: {
                  key,
                  value,
                  allowed: iterate.reduce([...allowed], '', (acc, value, index) =>
                    index === 0 ? `"${value}"` : `${acc}, "${value}"`,
                  ),
                },
              })
            }
          })
        })
      },
    }
  },
})
