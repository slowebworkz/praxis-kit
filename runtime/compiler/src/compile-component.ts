import { createHash } from 'node:crypto'
import type { Pass, Plugin } from '@pk2/pipeline'
import { createPipeline, executePipeline } from '@pk2/pipeline'
import type { ComponentContext, ComponentDefinition } from '@pk2/core'
import { componentMergeStrategy, resolveDefinition } from '@pk2/core'
import type { CompiledComponentArtifact } from './types'

const emptyContext = (): ComponentContext => ({
  identity: {},
  capabilities: {},
  metadata: {},
  diagnostics: [],
})

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16)
}

function buildArtifact(definition: ComponentDefinition): CompiledComponentArtifact {
  return {
    version: 1,
    definition,
    metadata: {
      capabilities: definition.capabilities,
      diagnostics: definition.diagnostics,
    },
    hashes: {
      topology: sha256({ identity: definition.identity, capabilities: definition.capabilities }),
      styling: sha256(definition.metadata),
    },
  }
}

export async function compileComponent(
  nodes: ReadonlyMap<string, Pass<ComponentContext>>,
  plugins?: Plugin<ComponentContext>[],
): Promise<CompiledComponentArtifact | null> {
  const pipeline = createPipeline<ComponentContext>({
    name: 'component',
    strategy: 'sequential',
    merge: componentMergeStrategy,
    nodes,
    ...(plugins !== undefined ? { plugins } : {}),
  })

  const context = await executePipeline(pipeline, emptyContext())
  const definition = resolveDefinition(context)

  return definition === null ? null : buildArtifact(definition)
}
