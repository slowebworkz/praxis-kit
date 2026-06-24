import type { Pass, PipelineNode } from '@pk2/pipeline'
import type { CompilerContext } from './types'

export const completeIdentityPass: Pass<CompilerContext> = {
  name: 'complete-identity',
  execute: () => ({ context: { identity: { name: 'Button', tag: 'button', id: 'btn-1' } } }),
}

export const namePass: Pass<CompilerContext> = {
  name: 'name',
  execute: () => ({ context: { identity: { name: 'Button' } } }),
}

export const tagPass: Pass<CompilerContext> = {
  name: 'tag',
  execute: () => ({ context: { identity: { tag: 'button' } } }),
}

export const idPass: Pass<CompilerContext> = {
  name: 'id',
  execute: () => ({ context: { identity: { id: 'btn-1' } } }),
}

export const capabilitiesPass: Pass<CompilerContext> = {
  name: 'capabilities',
  execute: () => ({ context: { capabilities: { interactive: true } } }),
}

export const metadataPass: Pass<CompilerContext> = {
  name: 'metadata',
  execute: () => ({ context: { metadata: { role: 'button' } } }),
}

export const diagnosticPass: Pass<CompilerContext> = {
  name: 'diagnostic',
  execute: () => ({
    context: { diagnostics: [{ code: 'W001', message: 'missing label', severity: 'warning' }] },
  }),
}

export function nodes(
  ...entries: (PipelineNode<CompilerContext> | undefined)[]
): ReadonlyMap<string, PipelineNode<CompilerContext>> {
  return new Map(
    entries
      .filter((n): n is PipelineNode<CompilerContext> => n !== undefined)
      .map((n) => [n.name, n]),
  )
}
