import type { Pass, Plugin } from '@praxis-kit/pipeline'
import type { CompilerContext } from './types'
import { describe, expect, it } from 'vitest'
import { compileComponent } from './compile-component'
import { completeIdentityPass, nodes } from './compile-component.helpers'

describe('plugins', () => {
  it('plugin processors run alongside pipeline nodes', async () => {
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
      create: () => [pluginPass],
    }
    await compileComponent(nodes(completeIdentityPass), [plugin])
    expect(seen).toContain('plugin')
  })

  it('plugin returning empty array contributes nothing', async () => {
    const plugin: Plugin<CompilerContext> = {
      name: 'empty-plugin',
      create: () => [],
    }
    const result = await compileComponent(nodes(completeIdentityPass), [plugin])
    expect(result).not.toBeNull()
  })

  it('throws when a plugin tries to inject a processor that already exists in the pipeline', async () => {
    const conflictPlugin: Plugin<CompilerContext> = {
      name: 'conflict-plugin',
      create: () => [completeIdentityPass],
    }
    await expect(compileComponent(nodes(completeIdentityPass), [conflictPlugin])).rejects.toThrow(
      '"complete-identity"',
    )
  })
})
