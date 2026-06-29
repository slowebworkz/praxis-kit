import { RuleCreator } from '@typescript-eslint/utils/eslint-utils'
import {
  asArrayExpression,
  asObjectExpression,
  getFirstObjectArg,
  getObjectProperty,
  isFactoryCall,
} from '../utils/ast'
import { iterate } from '@praxis-kit/primitive'

const createRule = RuleCreator((name) => `https://praxis-kit.dev/eslint-rules/${name}`)

export type Options = [{ calleeNames?: string[] }]

export type MessageIds = 'missingStrict'

export const noEnforcementWithoutStrict = createRule<Options, MessageIds>({
  name: 'no-enforcement-without-strict',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require enforcement.strict when enforcement.children or enforcement.aria is defined.',
    },
    messages: {
      missingStrict:
        'enforcement.{{ field }} is defined but enforcement.strict is not explicitly set. ' +
        'Adapter defaults vary — declare strict explicitly so the behavior is clear at the call site.',
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

        const hasStrict = getObjectProperty(enf, 'strict') !== undefined

        if (hasStrict) return

        const field = iterate.find(['children', 'aria'] as const, (field) => {
          const fieldProp = getObjectProperty(enf, field)
          if (!fieldProp) {
            return null
          }

          // children must be a non-empty array to be meaningful
          if (field === 'children') {
            const arr = asArrayExpression(fieldProp.value)
            if (!arr || arr.elements.length === 0) {
              return null
            }
          }

          return field
        })

        if (field) {
          // Report on the call expression so eslint-disable-next-line works on the factory call line.
          context.report({
            node,
            messageId: 'missingStrict',
            data: { field },
          })
        }
      },
    }
  },
})
