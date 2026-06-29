import { ChildrenEvaluator, diagnosticsFromStrictMode } from '@praxis-kit/contract'
import { iterate } from '@praxis-kit/primitive'
import { htmlContracts } from './contracts'

// HTML evaluators use 'warn' mode: structural violations are surfaced but never throw.
const htmlDiagnostics = diagnosticsFromStrictMode('warn')

function buildEvaluatorMap(): ReadonlyMap<string, ChildrenEvaluator> {
  const map = new Map<string, ChildrenEvaluator>()
  iterate.forEachEntry(htmlContracts, (tag, { children }) => {
    if (children?.length) {
      map.set(tag, new ChildrenEvaluator(children, htmlDiagnostics, `<${tag}>`))
    }
  })
  return map
}

const HTML_EVALUATORS = buildEvaluatorMap()

export function getHtmlChildrenEvaluator(tag: unknown): ChildrenEvaluator | undefined {
  return typeof tag === 'string' ? HTML_EVALUATORS.get(tag) : undefined
}
