import type { Pass, Plugin } from '@pk2/pipeline'
import { createPipeline, executePipeline } from '@pk2/pipeline'
import type { ComponentContext, ComponentDefinition } from '@pk2/core'
import { componentMergeStrategy, resolveDefinition } from '@pk2/core'

const emptyContext = (): ComponentContext => ({
  identity: {},
  capabilities: {},
  metadata: {},
  diagnostics: [],
})

export async function compileComponent(
  nodes: ReadonlyMap<string, Pass<ComponentContext>>,
  plugins?: Plugin<ComponentContext>[],
): Promise<ComponentDefinition | null> {
  const pipeline = createPipeline<ComponentContext>({
    name: 'component',
    strategy: 'sequential',
    merge: componentMergeStrategy,
    nodes,
    ...(plugins !== undefined ? { plugins } : {}),
  })

  const context = await executePipeline(pipeline, emptyContext())

  return resolveDefinition(context)
}
