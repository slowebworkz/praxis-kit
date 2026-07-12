import { ChildrenEvaluator } from '@praxis-kit/contract'
import { iterate } from '@praxis-kit/primitive'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { htmlContracts } from './contracts'

const htmlDiagnostics = warnDiagnostics

function buildEvaluatorMap(): ReadonlyMap<string, ChildrenEvaluator> {
  const map = new Map<string, ChildrenEvaluator>()
  iterate.forEachEntry(htmlContracts, (tag, { children, exclusiveChildren, allowText }) => {
    if (children?.length || exclusiveChildren || allowText === false) {
      map.set(
        tag,
        new ChildrenEvaluator(children ?? [], htmlDiagnostics, `<${tag}>`, {
          exclusiveChildren,
          allowText,
        }),
      )
    }
  })
  return map
}

const HTML_EVALUATORS = buildEvaluatorMap()

export function getHtmlChildrenEvaluator(tag: unknown): ChildrenEvaluator | undefined {
  return typeof tag === 'string' ? HTML_EVALUATORS.get(tag) : undefined
}
