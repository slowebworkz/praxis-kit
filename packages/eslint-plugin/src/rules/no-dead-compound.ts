import { RuleCreator } from '@typescript-eslint/utils/eslint-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import {
  asObjectExpression,
  asArrayExpression,
  asStringLiteral,
  getFirstObjectArg,
  getObjectProperty,
  getPropertyKey,
  isFactoryCall,
} from '../utils/ast'

type Property = TSESTree.Property

const createRule = RuleCreator((name) => `https://polymorphic-ui.dev/eslint-rules/${name}`)

export type Options = [{ calleeNames?: string[] }]

export type MessageIds = 'unknownVariantKey' | 'unknownVariantValue'

// Builds { variantKey → Set<allowedValue> } from a styling.variants ObjectExpression.
// Returns undefined if the node isn't a static object literal (can't analyze).
function extractVariantMap(variantsNode: TSESTree.Node): Map<string, Set<string>> | undefined {
  const variantsObj = asObjectExpression(variantsNode)
  if (!variantsObj) return undefined

  const map = new Map<string, Set<string>>()

  for (const prop of variantsObj.properties) {
    if (prop.type !== 'Property') continue
    const key = getPropertyKey(prop as Property)
    if (!key) continue

    const valuesObj = asObjectExpression(prop.value)
    if (!valuesObj) continue

    const values = new Set<string>()
    for (const vProp of valuesObj.properties) {
      if (vProp.type !== 'Property') continue
      const vKey = getPropertyKey(vProp as Property)
      if (vKey !== undefined) values.add(vKey)
    }
    map.set(key, values)
  }

  return map
}

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
    const calleeNames = new Set(context.options[0]?.calleeNames ?? ['createPolymorphicComponent'])

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

        for (const element of compounds.elements) {
          if (!element || element.type !== 'ObjectExpression') continue

          for (const prop of element.properties) {
            if (prop.type !== 'Property') continue

            const key = getPropertyKey(prop as Property)
            if (!key || key === 'class' || key === 'className') continue

            if (!variantMap.has(key)) {
              context.report({
                node: prop,
                messageId: 'unknownVariantKey',
                data: { key },
              })
              continue
            }

            // Only validate the value if it's a static string or identifier-as-string.
            const value = asStringLiteral((prop as Property).value)
            if (value === undefined) continue

            const allowed = variantMap.get(key)!
            if (!allowed.has(value)) {
              context.report({
                node: prop,
                messageId: 'unknownVariantValue',
                data: { key, value, allowed: [...allowed].map((v) => `"${v}"`).join(', ') },
              })
            }
          }
        }
      },
    }
  },
})
