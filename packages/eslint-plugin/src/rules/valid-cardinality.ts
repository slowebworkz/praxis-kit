import { RuleCreator } from '@typescript-eslint/utils/eslint-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import {
  asArrayExpression,
  asNumericLiteral,
  asObjectExpression,
  getFirstObjectArg,
  getObjectProperty,
  isFactoryCall,
} from '../utils/ast'
import { iterate } from '@praxis-kit/primitive'

const createRule = RuleCreator((name) => `https://praxis-kit.dev/eslint-rules/${name}`)

export type Options = [{ calleeNames?: string[] }]

export type MessageIds = 'negativeMin' | 'negativeMax' | 'maxLessThanMin' | 'zeroMax'

export const validCardinality = createRule<Options, MessageIds>({
  name: 'valid-cardinality',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce valid min/max values in enforcement.children cardinality rules.',
    },
    messages: {
      negativeMin: 'cardinality.min must be >= 0 (got {{ value }}).',
      negativeMax: 'cardinality.max must be >= 0 (got {{ value }}).',
      maxLessThanMin:
        'cardinality.max ({{ max }}) must be >= cardinality.min ({{ min }}). This rule can never be satisfied.',
      zeroMax:
        'cardinality.max of 0 means no children of this type are allowed. Use 0 intentionally or remove the rule.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          calleeNames: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const calleeNames = new Set(context.options[0]?.calleeNames ?? ['createContractComponent'])

    function validateCardinality(cardProp: TSESTree.Property): void {
      const card = asObjectExpression(cardProp.value)
      if (!card) return

      const minProp = getObjectProperty(card, 'min')
      const maxProp = getObjectProperty(card, 'max')

      const min = minProp ? asNumericLiteral(minProp.value) : undefined
      const max = maxProp ? asNumericLiteral(maxProp.value) : undefined

      if (minProp && min !== undefined && min < 0) {
        context.report({ node: minProp, messageId: 'negativeMin', data: { value: String(min) } })
      }

      if (maxProp && max !== undefined && max < 0) {
        context.report({ node: maxProp, messageId: 'negativeMax', data: { value: String(max) } })
      }

      if (maxProp && max === 0) {
        context.report({ node: maxProp, messageId: 'zeroMax' })
      }

      if (min !== undefined && max !== undefined && min >= 0 && max > 0 && max < min) {
        context.report({
          node: cardProp,
          messageId: 'maxLessThanMin',
          data: { min: String(min), max: String(max) },
        })
      }
    }

    return {
      CallExpression(node) {
        if (!isFactoryCall(node, calleeNames)) return

        const arg = getFirstObjectArg(node)
        if (!arg) return

        const enfProp = getObjectProperty(arg, 'enforcement')
        if (!enfProp) return

        const enf = asObjectExpression(enfProp.value)
        if (!enf) return

        const childrenProp = getObjectProperty(enf, 'children')
        if (!childrenProp) return

        const arr = asArrayExpression(childrenProp.value)
        if (!arr) return

        iterate.forEach(arr.elements, (element) => {
          if (!element || element.type !== 'ObjectExpression') return

          const cardProp = getObjectProperty(element, 'cardinality')
          if (!cardProp) return

          validateCardinality(cardProp)
        })
      },
    }
  },
})
