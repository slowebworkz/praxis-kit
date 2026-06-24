import type { Pass } from '@pk2/pipeline'
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
  ...passes: (Pass<CompilerContext> | undefined)[]
): ReadonlyMap<string, Pass<CompilerContext>> {
  return new Map(
    passes.filter((p): p is Pass<CompilerContext> => p !== undefined).map((p) => [p.name, p]),
  )
}
