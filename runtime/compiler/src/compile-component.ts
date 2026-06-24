import { createHash } from 'node:crypto'
import type { PipelineNode, Plugin } from '@pk2/pipeline'
import { createPipeline, executePipeline } from '@pk2/pipeline'
import type { ComponentDefinition } from '@pk2/core'
import { resolveDefinition } from '@pk2/core'
import { compilerMergeStrategy } from './compiler-merge-strategy'
import type { CompilerContext, CompiledComponentArtifact } from './types'

const emptyContext = (): CompilerContext => ({
  identity: {},
  capabilities: {},
  metadata: {},
  diagnostics: [],
})

// Sorts object keys recursively so hash output is independent of property insertion order.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (typeof value === 'object' && value !== null)
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonicalize(v)]),
    )
  return value
}

function sha256(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex')
    .slice(0, 16)
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v)
  return value
}

function buildArtifact(
  context: CompilerContext,
  definition: ComponentDefinition,
): CompiledComponentArtifact {
  return deepFreeze({
    version: 1 as const,
    definition,
    metadata: {
      capabilities: definition.capabilities,
      diagnostics: definition.diagnostics,
      ...(context.slots !== undefined ? { slots: context.slots } : {}),
      ...(context.variants !== undefined ? { variants: context.variants } : {}),
    },
    hashes: {
      topology: sha256({ identity: definition.identity, capabilities: definition.capabilities }),
      styling: sha256(definition.metadata),
    },
    ...(context.precomputed !== undefined ? { precomputed: context.precomputed } : {}),
  })
}

export async function compileComponent(
  nodes: ReadonlyMap<string, PipelineNode<CompilerContext>>,
  plugins?: Plugin<CompilerContext>[],
): Promise<CompiledComponentArtifact | null> {
  const pipeline = createPipeline<CompilerContext>({
    name: 'component',
    strategy: 'sequential',
    merge: compilerMergeStrategy,
    nodes,
    ...(plugins !== undefined ? { plugins } : {}),
  })

  const context = await executePipeline(pipeline, emptyContext())
  const definition = resolveDefinition(context)

  return definition === null ? null : buildArtifact(context, definition)
}
