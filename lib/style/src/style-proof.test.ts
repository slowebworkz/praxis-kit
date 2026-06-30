import type { MergeStrategy, Pass } from '@pk2/pipeline'
import { describe, expect, it } from 'vitest'
import { basePass, focusPass, hoverPass, styleMergeStrategy } from './index'
import type { StyleContext } from './types'

async function runPipeline(
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

function createPass(name: string, classes: string[] = []): Pass<StyleContext> {
  return {
    name,
    execute: () => ({ context: { classes } }),
  }
}

describe('styling proof path', () => {
  it('returns the initial context for an empty pipeline', async () => {
    const initial = { classes: ['foo'] }
    expect(await runPipeline(initial, [])).toEqual(initial)
  })

  it('accumulates classes across passes', async () => {
    const result = await runPipeline({ classes: [] }, [basePass, hoverPass, focusPass])
    expect(result.classes).toEqual(['inline-flex', 'hover:bg-blue-500', 'focus:ring'])
  })

  it('pass order determines class order', async () => {
    const result = await runPipeline({ classes: [] }, [hoverPass, basePass])
    expect(result.classes).toEqual(['hover:bg-blue-500', 'inline-flex'])
  })

  it('a pass contributing no classes leaves context unchanged', async () => {
    const result = await runPipeline({ classes: [] }, [basePass, createPass('empty'), hoverPass])
    expect(result.classes).toEqual(['inline-flex', 'hover:bg-blue-500'])
  })

  it('passes are independent of merge strategy', async () => {
    const overwriteStrategy: MergeStrategy<StyleContext> = {
      merge: (_, incoming) => ({ classes: incoming.classes ?? [] }),
    }
    const result = await runPipeline(
      { classes: [] },
      [basePass, hoverPass, focusPass],
      overwriteStrategy,
    )
    // each pass overwrites the previous — only the last survives
    expect(result.classes).toEqual(['focus:ring'])
  })

  it('each pass receives the merged context from prior passes', async () => {
    const first = createPass('first', ['inline-flex'])
    const second: Pass<StyleContext> = {
      name: 'second',
      execute(ctx) {
        expect(ctx.classes).toEqual(['inline-flex'])
        return { context: { classes: ['hover:bg-blue-500'] } }
      },
    }
    await runPipeline({ classes: [] }, [first, second])
  })

  it('handles async passes and executes them sequentially', async () => {
    const delayed: Pass<StyleContext> = {
      name: 'async',
      async execute() {
        await Promise.resolve()
        return { context: { classes: ['foo'] } }
      },
    }
    const result = await runPipeline({ classes: [] }, [delayed])
    expect(result.classes).toEqual(['foo'])
  })
})
