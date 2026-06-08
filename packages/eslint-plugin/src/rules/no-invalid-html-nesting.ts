import { RuleCreator } from '@typescript-eslint/utils/eslint-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import { HTML_ALLOWED_CHILDREN } from '../utils/html-nesting'

const createRule = RuleCreator((name) => `https://praxis-kit.dev/eslint-rules/${name}`)

export type Options = []

export type MessageIds = 'invalidChild'

function getIntrinsicTag(name: TSESTree.JSXTagNameExpression): string | undefined {
  if (name.type !== 'JSXIdentifier') return undefined
  const text = name.name
  // Intrinsic HTML elements start with a lowercase letter.
  return text.length > 0 && text[0] === text[0]!.toLowerCase() && text[0] !== text[0]!.toUpperCase()
    ? text
    : undefined
}

export const noInvalidHtmlNesting = createRule<Options, MessageIds>({
  name: 'no-invalid-html-nesting',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow HTML children that violate the HTML5 content model for their parent element.',
    },
    messages: {
      invalidChild:
        '<{{ child }}> is not a valid direct child of <{{ parent }}>. ' +
        'Allowed children: {{ allowed }}.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXElement(node) {
        const parentTag = getIntrinsicTag(node.openingElement.name)
        if (!parentTag) return

        const allowed = HTML_ALLOWED_CHILDREN[parentTag]
        if (!allowed) return

        for (const child of node.children) {
          // JSXText, JSXExpressionContainer, JSXSpreadChild, JSXFragment — skip.
          // Text nodes are whitespace; expressions are dynamic (can't statically analyze).
          if (child.type !== 'JSXElement') continue

          const childTag = getIntrinsicTag(child.openingElement.name)
          if (childTag === undefined) continue
          if (allowed.has(childTag)) continue

          context.report({
            node: child,
            messageId: 'invalidChild',
            data: {
              child: childTag,
              parent: parentTag,
              allowed: [...allowed].join(', '),
            },
          })
        }
      },
    }
  },
})
