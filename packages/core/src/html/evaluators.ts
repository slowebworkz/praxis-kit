import { ChildrenEvaluator, HtmlDiagnostics } from '@praxis-kit/contract'
import { isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { htmlContracts } from './contracts'

const htmlDiagnostics = warnDiagnostics

// What each parent accepts, as data (see `HtmlDiagnostics.invalidChild`): a list of tags, or the
// phrasing-content model. Parents with no entry get the "permitted content model" wording.
const LIST_ITEMS = ['<li>', '<script>', '<template>'] as const
const HTML_CHILD_CONTENT: Readonly<StringMap<readonly string[] | 'phrasing'>> = {
  ul: LIST_ITEMS,
  ol: LIST_ITEMS,
  menu: LIST_ITEMS,
  a: 'phrasing',
}

/**
 * The invalid-child diagnostic for a child that a built-in HTML parent rejects, with what that parent
 * accepts reported as data (see `HtmlDiagnostics.invalidChild`).
 */
export function invalidHtmlChild(child: string, parent: string) {
  return HtmlDiagnostics.invalidChild(child, parent, HTML_CHILD_CONTENT[parent])
}

function buildEvaluatorMap(): ReadonlyMap<string, ChildrenEvaluator> {
  const map = new Map<string, ChildrenEvaluator>()
  iterate.forEachEntry(htmlContracts, (tag, { children, exclusiveChildren, allowText }) => {
    if (children?.length || exclusiveChildren || allowText === false) {
      map.set(
        tag,
        new ChildrenEvaluator(children ?? [], htmlDiagnostics, `<${tag}>`, {
          exclusiveChildren,
          allowText,
          unexpectedChildDiagnostic: (child, _index, context) => {
            const parent = context.replace(/[<>]/g, '')
            return invalidHtmlChild(child, parent)
          },
        }),
      )
    }
  })
  return map
}

const HTML_EVALUATORS = buildEvaluatorMap()

export function getHtmlChildrenEvaluator(tag: unknown): ChildrenEvaluator | undefined {
  return isString(tag) ? HTML_EVALUATORS.get(tag) : undefined
}
