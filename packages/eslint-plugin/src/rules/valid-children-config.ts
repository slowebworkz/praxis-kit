import { RuleCreator } from '@typescript-eslint/utils/eslint-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import {
  asArrayExpression,
  asNumericLiteral,
  asObjectExpression,
  asStringLiteral,
  getFirstObjectArg,
  getObjectProperty,
  isFactoryCall,
} from '../utils/ast'

const createRule = RuleCreator((name) => `https://praxis-kit.dev/eslint-rules/${name}`)

export type Options = [{ calleeNames?: string[] }]

export type MessageIds = 'multipleFirst' | 'multipleLast' | 'minSumExceedsCapacity'

export const validChildrenConfig = createRule<Options, MessageIds>({
  name: 'valid-children-config',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce cross-rule consistency of enforcement.children — detect positional conflicts and cardinality impossibilities.',
    },
    messages: {
      multipleFirst:
        'Multiple enforcement.children rules require position: "first". Only one child can occupy the first position.',
      multipleLast:
        'Multiple enforcement.children rules require position: "last". Only one child can occupy the last position.',
      minSumExceedsCapacity:
        'A rule with position: "only" requires min >= 1, but {{ count }} other rule(s) also require min >= 1. These constraints cannot be satisfied simultaneously.',
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

        const firstPositionProps: TSESTree.Property[] = []
        const lastPositionProps: TSESTree.Property[] = []
        let onlyWithMinProp: TSESTree.Property | null = null
        let rulesWithMinCount = 0

        for (const element of arr.elements) {
          if (!element || element.type !== 'ObjectExpression') continue

          const positionProp = getObjectProperty(element, 'position')
          const position = positionProp ? asStringLiteral(positionProp.value) : undefined

          const cardProp = getObjectProperty(element, 'cardinality')
          const card = cardProp ? asObjectExpression(cardProp.value) : undefined
          const minProp = card ? getObjectProperty(card, 'min') : undefined
          const min = minProp ? (asNumericLiteral(minProp.value) ?? 0) : 0

          if (position === 'first' && positionProp) {
            firstPositionProps.push(positionProp)
          }
          if (position === 'last' && positionProp) {
            lastPositionProps.push(positionProp)
          }

          if (min >= 1) {
            rulesWithMinCount++
            if (position === 'only' && positionProp && !onlyWithMinProp) {
              onlyWithMinProp = positionProp
            }
          }
        }

        for (const prop of firstPositionProps.slice(1)) {
          context.report({ node: prop, messageId: 'multipleFirst' })
        }

        for (const prop of lastPositionProps.slice(1)) {
          context.report({ node: prop, messageId: 'multipleLast' })
        }

        if (onlyWithMinProp && rulesWithMinCount > 1) {
          context.report({
            node: onlyWithMinProp,
            messageId: 'minSumExceedsCapacity',
            data: { count: String(rulesWithMinCount - 1) },
          })
        }
      },
    }
  },
})
