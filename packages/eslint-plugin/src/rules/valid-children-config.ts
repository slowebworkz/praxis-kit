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
import { iterate } from '@praxis-kit/primitive'

const createRule = RuleCreator((name) => `https://praxis-kit.dev/eslint-rules/${name}`)

type ChildrenAnalysis = {
  firstPositionProps: TSESTree.Property[]
  lastPositionProps: TSESTree.Property[]
  onlyWithMinProp: TSESTree.Property | null
  requiredRuleCount: number
}

function analyzeChildrenRules(elements: TSESTree.ArrayExpression['elements']): ChildrenAnalysis {
  const firstPositionProps: TSESTree.Property[] = []
  const lastPositionProps: TSESTree.Property[] = []
  let onlyWithMinProp: TSESTree.Property | null = null
  let requiredRuleCount = 0

  iterate.forEach(elements, (element) => {
    if (!element || element.type !== 'ObjectExpression') return

    const positionProp = getObjectProperty(element, 'position')
    const position = positionProp ? asStringLiteral(positionProp.value) : undefined

    const cardProp = getObjectProperty(element, 'cardinality')
    const card = cardProp ? asObjectExpression(cardProp.value) : undefined
    const minProp = card ? getObjectProperty(card, 'min') : undefined
    const min = minProp ? (asNumericLiteral(minProp.value) ?? 0) : 0

    if (position === 'first' && positionProp) firstPositionProps.push(positionProp)
    if (position === 'last' && positionProp) lastPositionProps.push(positionProp)

    if (min >= 1) {
      requiredRuleCount++
      if (position === 'only' && positionProp && !onlyWithMinProp) {
        onlyWithMinProp = positionProp
      }
    }
  })

  return { firstPositionProps, lastPositionProps, onlyWithMinProp, requiredRuleCount }
}

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

        const { firstPositionProps, lastPositionProps, onlyWithMinProp, requiredRuleCount } =
          analyzeChildrenRules(arr.elements)

        iterate.forEach(firstPositionProps.slice(1), (prop) => {
          context.report({ node: prop, messageId: 'multipleFirst' })
        })

        iterate.forEach(lastPositionProps.slice(1), (prop) => {
          context.report({ node: prop, messageId: 'multipleLast' })
        })

        if (onlyWithMinProp && requiredRuleCount > 1) {
          context.report({
            node: onlyWithMinProp,
            messageId: 'minSumExceedsCapacity',
            data: { count: String(requiredRuleCount - 1) },
          })
        }
      },
    }
  },
})
