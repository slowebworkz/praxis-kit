import { RuleCreator } from '@typescript-eslint/utils/eslint-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import { HTML_CONTENT_MODELS, TAG_CATEGORIES } from '../utils/html-nesting'
import { iterate } from '@praxis-kit/primitive'

const createRule = RuleCreator((name) => `https://praxis-kit.dev/eslint-rules/${name}`)

const ALLOWED_TEXT: Record<string, string> = Object.fromEntries(
  Object.entries(HTML_CONTENT_MODELS).map(([tag, model]) => [
    tag,
    model.kind === 'specific'
      ? [...model.allowed].join(', ')
      : [...model.allowed].map((c) => `${c} content`).join(', '),
  ]),
)

export type Options = []

export type MessageIds = 'invalidChild'

function getIntrinsicTag(name: TSESTree.JSXTagNameExpression): string | undefined {
  if (name.type !== 'JSXIdentifier') return undefined
  return /^[a-z]/.test(name.name) ? name.name : undefined
}

function isAllowed(childTag: string, model: (typeof HTML_CONTENT_MODELS)[string]): boolean {
  if (model.kind === 'specific') return model.allowed.has(childTag)
  const cats = TAG_CATEGORIES[childTag]
  if (!cats) return true // unknown child tag — don't flag
  return [...model.allowed].some((c) => cats.has(c))
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
        '<{{ child }}> is not a valid direct child of <{{ parent }}>. ' + 'Allowed: {{ allowed }}.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXElement(node) {
        const parentTag = getIntrinsicTag(node.openingElement.name)
        if (!parentTag) return

        const model = HTML_CONTENT_MODELS[parentTag]
        if (!model) return

        iterate.forEach(node.children, (child) => {
          // JSXText, JSXExpressionContainer, JSXSpreadChild, JSXFragment — skip.
          // Text nodes are whitespace; expressions are dynamic (can't statically analyze).
          if (child.type !== 'JSXElement') return

          const childTag = getIntrinsicTag(child.openingElement.name)
          if (childTag === undefined) return
          if (isAllowed(childTag, model)) return

          context.report({
            node: child,
            messageId: 'invalidChild',
            data: {
              child: childTag,
              parent: parentTag,
              allowed: ALLOWED_TEXT[parentTag] ?? '',
            },
          })
        })
      },
    }
  },
})
