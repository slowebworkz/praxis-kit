import { describe, expect, it } from 'vitest'
import { CALLER_MIXED_WITH_GAP, expectTokenList, tokensOf, withWarnSpy } from './helpers'

export type TailwindPolymorphicElementInput = {
  /** Omit to use the component's configured default tag. */
  readonly as?: string
  readonly displayProps: Readonly<Record<string, boolean>>
  readonly className: string
}

export type TailwindPolymorphicElementResult = {
  readonly tagName: string
  readonly className: string
  readonly flexAttribute: string | null
}

export type TailwindPolymorphicElementStep = TailwindPolymorphicElementInput

export type TailwindPolymorphicElementParityAdapter = {
  readonly render: (
    input: TailwindPolymorphicElementInput,
  ) => TailwindPolymorphicElementResult | Promise<TailwindPolymorphicElementResult>
  /** Mount once, update the same component instance, and return the resulting host after each step. */
  readonly reactivity?: (
    steps: readonly TailwindPolymorphicElementStep[],
  ) => Promise<readonly TailwindPolymorphicElementResult[]>
}

function expectFlexResolution(result: TailwindPolymorphicElementResult): void {
  expectTokenList(tokensOf(result.className), {
    has: ['base', 'flex', 'flex-col', 'gap-4', 'rounded'],
    lacks: ['grid-cols-3'],
  })
  expect(result.flexAttribute).toBeNull()
}

// The input shared by every scenario here: flex display with the mixed caller classes. `as` is
// left out entirely (not set to undefined) when no override is wanted.
const flexInput = (as?: string): TailwindPolymorphicElementInput => ({
  ...(as === undefined ? {} : { as }),
  displayProps: { flex: true },
  className: CALLER_MIXED_WITH_GAP,
})

/**
 * Verifies that the Tailwind pipeline receives the resolved polymorphic host tag, not merely the
 * component's configured default tag. The same flex layout must resolve consistently on ordinary
 * hosts, while a transition to a void host must produce the void-element diagnostic.
 *
 * Run in a `// @vitest-environment jsdom` test file. Only adapters with a public `as` host override
 * participate; Lit and Web expose fixed custom-element hosts rather than this polymorphic contract.
 */
export function tailwindPolymorphicElementParitySuite(
  adapter: TailwindPolymorphicElementParityAdapter,
): void {
  describe('Tailwind polymorphic element parity', () => {
    it('uses the configured default host when no as override is supplied', async () => {
      const result = await adapter.render(flexInput())

      expect(result.tagName).toBe('div')
      expectFlexResolution(result)
    })

    it('applies the same Tailwind resolution to an overridden non-void host', async () => {
      const result = await adapter.render(flexInput('section'))

      expect(result.tagName).toBe('section')
      expectFlexResolution(result)
    })

    it('uses the resolved void host for Tailwind diagnostics', async () => {
      await withWarnSpy(async (warn) => {
        const result = await adapter.render(flexInput('img'))

        expect(result.tagName).toBe('img')
        expectFlexResolution(result)
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('<img>'))
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('"flex"'))
      })
    })

    const { reactivity } = adapter
    if (reactivity) {
      it('re-resolves the host tag and void diagnostic after a polymorphic element change', async () => {
        await withWarnSpy(async (warn) => {
          const results = await reactivity([
            flexInput('div'),
            flexInput('img'),
            { as: 'section', displayProps: { flex: true }, className: 'flex-col rounded-lg' },
          ])

          expect(results.map((result) => result.tagName)).toEqual(['div', 'img', 'section'])
          expectFlexResolution(results[0]!)
          expectFlexResolution(results[1]!)
          expectTokenList(tokensOf(results[2]!.className), {
            has: ['base', 'flex', 'flex-col', 'rounded-lg'],
            lacks: ['rounded', 'grid-cols-3'],
          })
          expect(results[2]!.flexAttribute).toBeNull()
          expect(warn).toHaveBeenCalledWith(expect.stringContaining('<img>'))
          expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('<section>'))
        })
      })
    }
  })
}
