import { describe, expect, it } from 'vitest'
import type { MergeStrategy } from '@pk2/merge'
import type { Pass } from '@pk2/pipeline'
import { basePass, focusPass, hoverPass, styleMergeStrategy } from './index'
import type { StyleContext } from './types'

async function accumulate(
  initial: StyleContext,
  passes: Pass<StyleContext>[],
  strategy: MergeStrategy<StyleContext> = styleMergeStrategy,
): Promise<StyleContext> {
  let ctx = initial
  for (const pass of passes) {
    const result = await pass.execute(ctx)
    ctx = strategy.merge(ctx, result.context ?? {})
  }
  return ctx
}

describe('styling proof path', () => {
  it('accumulates classes across passes', async () => {
    const result = await accumulate({ classes: [] }, [basePass, hoverPass, focusPass])
    expect(result.classes).toEqual(['inline-flex', 'hover:bg-blue-500', 'focus:ring'])
  })

  it('pass order determines class order', async () => {
    const result = await accumulate({ classes: [] }, [hoverPass, basePass])
    expect(result.classes).toEqual(['hover:bg-blue-500', 'inline-flex'])
  })

  it('a pass contributing no classes leaves context unchanged', async () => {
    const emptyPass: Pass<StyleContext> = {
      name: 'empty',
      execute: () => ({ context: {} }),
    }
    const result = await accumulate({ classes: [] }, [basePass, emptyPass, hoverPass])
    expect(result.classes).toEqual(['inline-flex', 'hover:bg-blue-500'])
  })

  it('passes remain independent of merge semantics', async () => {
    const overwriteStrategy: MergeStrategy<StyleContext> = {
      merge: (_, incoming) => ({ classes: incoming.classes ?? [] }),
    }
    const result = await accumulate(
      { classes: [] },
      [basePass, hoverPass, focusPass],
      overwriteStrategy,
    )
    // each pass overwrites the previous — only the last survives
    expect(result.classes).toEqual(['focus:ring'])
  })
})
