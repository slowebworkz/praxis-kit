import { RuleCreator } from '@typescript-eslint/utils/eslint-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import { IMPLICIT_ROLES } from '../utils'
import { iterate, isString } from '@praxis-kit/primitive'

const createRule = RuleCreator((name) => `https://praxis-kit.dev/eslint-rules/${name}`)

export type Options = []

export type MessageIds = 'redundantRole'

function isRedundantRole(explicit: string, implicit: string): boolean {
  return explicit === implicit
}

function getJsxTagName(node: TSESTree.JSXOpeningElement): string | undefined {
  const name = node.name
  if (name.type === 'JSXIdentifier') return name.name
  return undefined
}

function getJsxStringAttribute(
  node: TSESTree.JSXOpeningElement,
  attrName: string,
): { node: TSESTree.JSXAttribute; value: string } | undefined {
  return (
    iterate.find(node.attributes, (attr) => {
      if (attr.type !== 'JSXAttribute') return null

      const { name: key } = attr
      if (key.type !== 'JSXIdentifier' || key.name !== attrName) return null

      const { value: val } = attr
      if (val === null) return null
      if (val.type === 'Literal' && isString(val.value)) {
        return { node: attr, value: val.value }
      }
      if (
        val.type === 'JSXExpressionContainer' &&
        val.expression.type === 'Literal' &&
        isString(val.expression.value)
      ) {
        return { node: attr, value: val.expression.value }
      }
      return null
    }) ?? undefined
  )
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

        if (isRedundantRole(roleAttr.value, implicitRole)) {
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
