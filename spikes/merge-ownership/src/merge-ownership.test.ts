import type { MergeStrategy } from '@pk2/merge'
import type { Pass } from '@pk2/pipeline'
import { createPipeline, executePipeline } from '@pk2/pipeline'
import type { StyleContext } from '@pk2/style'
import { styleMergeStrategy } from '@pk2/style'
import { tailwindPlugin } from '@pk2/tailwind'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Spike: Merge Ownership
//
// Question: does Pipeline-owns-merge compose for a multi-domain compiler,
// or is a DomainRegistry / MergeRegistry needed?
//
// Two models evaluated:
//
//   B) Composed MergeStrategy — one MergeStrategy<CompilerContext> that
//      delegates to each domain's merge strategy per field. Works, but every
//      new domain adds a branch. The compiler becomes a composite object, not
//      a pipeline. Structural smell: domain coupling lives in one place.
//
//   C) Isolated domain pipelines — each domain pipeline runs independently,
//      typed as Pipeline<DomainContext>, producing its own domain result.
//      The compiler executor assembles domain results into CompilerContext.
//      Domains own their pipelines; the compiler owns the assembly.
//      No MergeStrategy<CompilerContext> needed. No registry needed.
//
// Conclusion: Model C is the correct architecture. "Domains own pipelines"
// is the right frame. The compiler executor runs each domain pipeline and
// assembles their outputs. executePipeline<TContext> is the primitive that
// makes this possible, and it belongs in Phase 13.
// ---------------------------------------------------------------------------

// Domain contexts
interface SlotContext {
  names: string[]
}

interface CompilerContext {
  style: StyleContext
  slot: SlotContext
}

// ---------------------------------------------------------------------------
// Domain pipelines — each owns its context type and merge strategy
// ---------------------------------------------------------------------------

const slotMergeStrategy: MergeStrategy<SlotContext> = {
  merge: (previous, incoming) => ({
    names: [...previous.names, ...(incoming.names ?? [])],
  }),
}

const slotPass: Pass<SlotContext> = {
  name: 'base-slot',
  execute: () => ({ context: { names: ['trigger', 'content'] } }),
}

const stylePipeline = createPipeline<StyleContext>({
  name: 'style',
  strategy: 'sequential',
  merge: styleMergeStrategy,
  nodes: new Map([
    ['base', { name: 'base', execute: () => ({ context: { classes: ['inline-flex'] } }) }],
    ['hover', { name: 'hover', execute: () => ({ context: { classes: ['hover:bg-blue-500'] } }) }],
  ]),
  plugins: [tailwindPlugin],
})

const slotPipeline = createPipeline<SlotContext>({
  name: 'slot',
  strategy: 'sequential',
  merge: slotMergeStrategy,
  nodes: new Map([['base-slot', slotPass]]),
})

// ---------------------------------------------------------------------------
// Model B — contrast: works, but the smell is real
// ---------------------------------------------------------------------------

describe('Model B — Composed MergeStrategy (structural smell)', () => {
  it('composes domain strategies by delegation — but every new domain adds a branch', () => {
    const compilerMergeStrategy: MergeStrategy<CompilerContext> = {
      merge(previous, incoming) {
        return {
          style:
            incoming.style !== undefined
              ? styleMergeStrategy.merge(previous.style, incoming.style)
              : previous.style,
          slot:
            incoming.slot !== undefined
              ? slotMergeStrategy.merge(previous.slot, incoming.slot)
              : previous.slot,
          // A third domain (aria, layout, ...) means another branch here.
          // The merge strategy becomes a registry written by hand.
        }
      },
    }

    const initial: CompilerContext = { style: { classes: [] }, slot: { names: [] } }
    const a = compilerMergeStrategy.merge(initial, { style: { classes: ['inline-flex'] } })
    const b = compilerMergeStrategy.merge(a, { slot: { names: ['trigger'] } })

    expect(b.style.classes).toEqual(['inline-flex'])
    expect(b.slot.names).toEqual(['trigger'])
    // Correct output — but this is a composite object, not a pipeline.
    // The right question is: why does the compiler need to merge at all?
  })
})

// ---------------------------------------------------------------------------
// Model C — domains own pipelines
// ---------------------------------------------------------------------------

describe('Model C — domains own pipelines (correct architecture)', () => {
  it('each domain pipeline produces its own context independently', async () => {
    const styleResult = await executePipeline(stylePipeline, { classes: [] })
    const slotResult = await executePipeline(slotPipeline, { names: [] })

    expect(styleResult.classes).toContain('inline-flex')
    expect(styleResult.classes).toContain('hover:bg-blue-500')
    expect(styleResult.classes).toContain('bg-blue-500') // tailwind plugin
    expect(slotResult.names).toEqual(['trigger', 'content'])
  })

  it('compiler executor assembles domain results — no MergeStrategy<CompilerContext> needed', async () => {
    const styleResult = await executePipeline(stylePipeline, { classes: [] })
    const slotResult = await executePipeline(slotPipeline, { names: [] })

    // Assembly is direct object construction — trivially correct, zero infrastructure.
    const compilerResult: CompilerContext = {
      style: styleResult,
      slot: slotResult,
    }

    expect(compilerResult.style.classes).toContain('inline-flex')
    expect(compilerResult.slot.names).toEqual(['trigger', 'content'])
  })

  it('adding a domain is adding a pipeline and a field — no existing code changes', async () => {
    // Proof by extension: an aria domain composes without touching style or slot.
    interface AriaContext {
      roles: string[]
    }
    const ariaMergeStrategy: MergeStrategy<AriaContext> = {
      merge: (prev, inc) => ({ roles: [...prev.roles, ...(inc.roles ?? [])] }),
    }
    const ariaPipeline = createPipeline<AriaContext>({
      name: 'aria',
      strategy: 'sequential',
      merge: ariaMergeStrategy,
      nodes: new Map([
        ['base-aria', { name: 'base-aria', execute: () => ({ context: { roles: ['button'] } }) }],
      ]),
    })

    const styleResult = await executePipeline(stylePipeline, { classes: [] })
    const slotResult = await executePipeline(slotPipeline, { names: [] })
    const ariaResult = await executePipeline(ariaPipeline, { roles: [] })

    const compilerResult = { style: styleResult, slot: slotResult, aria: ariaResult }

    expect(compilerResult.aria.roles).toEqual(['button'])
    // stylePipeline and slotPipeline unchanged — zero coupling.
  })

  it('plugin injection works at the domain level; compiler assembly is unaffected', () => {
    // tailwindPlugin injects into stylePipeline<StyleContext>.
    // The compiler never sees the plugin — it just receives the assembled StyleContext.
    expect(stylePipeline.nodes.has('tailwind')).toBe(true)
    expect(stylePipeline.nodes.has('base')).toBe(true)
    // Plugin ownership is a domain concern, not a compiler concern.
  })
})

// ---------------------------------------------------------------------------
// Spike conclusion
//
// Pipeline-owns-merge is sufficient. No DomainRegistry or MergeRegistry needed.
//
// The right frame is: domains own pipelines.
//
//   stylePipeline: Pipeline<StyleContext>  → StyleContext
//   slotPipeline:  Pipeline<SlotContext>   → SlotContext
//   ariaPipeline:  Pipeline<AriaContext>   → AriaContext
//
//   compiler executor:
//     const style = await executePipeline(stylePipeline, initialStyle)
//     const slot  = await executePipeline(slotPipeline, initialSlot)
//     return { style, slot }
//
// executePipeline<TContext>(pipeline: Pipeline<TContext>, initial: TContext)
// is the primitive Phase 13 needs. It already works with the existing types.
//
// The `if ('execute' in node)` guard exists because PipelineNode<TContext> is
// Pass<TContext> | Pipeline<TContext>. Under Model C all nodes are passes in
// practice. Phase 13 can either simplify PipelineNode or leave the guard —
// the guard is harmless and preserves the recursive pipeline option.
// ---------------------------------------------------------------------------
