import { ChildrenEvaluator, HtmlDiagnostics  } from '@praxis-kit/contract'
import { isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { htmlContracts } from './contracts'

const htmlDiagnostics = warnDiagnostics

const HTML_CHILD_GUIDANCE: Readonly<StringMap<string>> = {
  ul: '<li>, <script>, or <template>',
  ol: '<li>, <script>, or <template>',
  menu: '<li>, <script>, or <template>',
  a: 'phrasing content, excluding interactive descendants such as <a>, <button>, and form controls',
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
            const allowed = HTML_CHILD_GUIDANCE[parent]
            return HtmlDiagnostics.invalidChild(
              child,
              parent,
              allowed ?? 'the parent element’s permitted content model',
            )
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
