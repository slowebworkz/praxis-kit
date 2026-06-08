import { RuleCreator } from '@typescript-eslint/utils/eslint-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import { IMPLICIT_ROLES } from '../utils/implicit-roles'

const createRule = RuleCreator((name) => `https://praxis-kit.dev/eslint-rules/${name}`)

export type Options = []

export type MessageIds = 'redundantRole'

function getJsxTagName(node: TSESTree.JSXOpeningElement): string | undefined {
  const name = node.name
  if (name.type === 'JSXIdentifier') return name.name
  return undefined
}

function getJsxStringAttribute(
  node: TSESTree.JSXOpeningElement,
  attrName: string,
): { node: TSESTree.JSXAttribute; value: string } | undefined {
  for (const attr of node.attributes) {
    if (attr.type !== 'JSXAttribute') continue
    const key = attr.name
    if (key.type !== 'JSXIdentifier' || key.name !== attrName) continue

    const val = attr.value
    if (val === null) continue // boolean attribute, no value
    if (val.type === 'Literal' && typeof val.value === 'string') {
      return { node: attr, value: val.value }
    }
    if (
      val.type === 'JSXExpressionContainer' &&
      val.expression.type === 'Literal' &&
      typeof val.expression.value === 'string'
    ) {
      return { node: attr, value: val.expression.value }
    }
  }
  return undefined
}

export const noRedundantRole = createRule<Options, MessageIds>({
  name: 'no-redundant-role',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow role attributes that duplicate the implicit ARIA role of the HTML element.',
    },
    fixable: 'code',
    messages: {
      redundantRole:
        'role="{{ role }}" is redundant on <{{ tag }}>: the element already carries this implicit ARIA role. Remove the attribute.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node) {
        const tag = getJsxTagName(node)
        if (!tag) return

        const implicitRole = IMPLICIT_ROLES[tag]
        if (!implicitRole) return

        const roleAttr = getJsxStringAttribute(node, 'role')
        if (!roleAttr) return

        if (roleAttr.value === implicitRole) {
          context.report({
            node: roleAttr.node,
            messageId: 'redundantRole',
            data: { role: roleAttr.value, tag },
            fix(fixer) {
              return fixer.remove(roleAttr.node)
            },
          })
        }
      },
    }
  },
})
