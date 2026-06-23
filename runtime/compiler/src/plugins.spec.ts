import type { Pass, Plugin } from '@pk2/pipeline'
import type { CompilerContext } from './types'
import { describe, expect, it } from 'vitest'
import { compileComponent } from './compile-component'
import { completeIdentityPass, nodes } from './compile-component.helpers'

describe('plugins', () => {
  it('plugin nodes run alongside pipeline nodes', async () => {
    const seen: string[] = []
    const pluginPass: Pass<CompilerContext> = {
      name: 'plugin-pass',
      execute: () => {
        seen.push('plugin')
        return {}
      },
    }
    const plugin: Plugin<CompilerContext> = {
      name: 'test-plugin',
      nodes: new Map([['plugin-pass', pluginPass]]),
    }
    await compileComponent(nodes(completeIdentityPass), [plugin])
    expect(seen).toContain('plugin')
  })

  it('throws when a plugin tries to inject a node that already exists in the pipeline', async () => {
    const conflictPlugin: Plugin<CompilerContext> = {
      name: 'conflict-plugin',
      nodes: new Map([['complete-identity', completeIdentityPass]]),
    }
    await expect(compileComponent(nodes(completeIdentityPass), [conflictPlugin])).rejects.toThrow(
      '"complete-identity"',
    )
  })
})
