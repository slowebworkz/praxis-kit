import { describe, expect, it, vi } from 'vitest'

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

function tokensOf(className: string): string[] {
  expect(className).not.toMatch(/^\s|\s$|\s{2,}/)
  const tokens = className.split(/\s+/)
  expect(tokens).toEqual([...new Set(tokens)])
  return tokens
}

function expectFlexResolution(result: TailwindPolymorphicElementResult): void {
  const tokens = tokensOf(result.className)
  expect(tokens).toContain('base')
  expect(tokens).toContain('flex')
  expect(tokens).toContain('flex-col')
  expect(tokens).toContain('gap-4')
  expect(tokens).toContain('rounded')
  expect(tokens).not.toContain('grid-cols-3')
  expect(result.flexAttribute).toBeNull()
}

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
      const result = await adapter.render({
        displayProps: { flex: true },
        className: 'flex-col grid-cols-3 gap-4 rounded',
      })

      expect(result.tagName).toBe('div')
      expectFlexResolution(result)
    })

    it('applies the same Tailwind resolution to an overridden non-void host', async () => {
      const result = await adapter.render({
        as: 'section',
        displayProps: { flex: true },
        className: 'flex-col grid-cols-3 gap-4 rounded',
      })

      expect(result.tagName).toBe('section')
      expectFlexResolution(result)
    })

    it('uses the resolved void host for Tailwind diagnostics', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const result = await adapter.render({
          as: 'img',
          displayProps: { flex: true },
          className: 'flex-col grid-cols-3 gap-4 rounded',
        })

        expect(result.tagName).toBe('img')
        expectFlexResolution(result)
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('<img>'))
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('"flex"'))
      } finally {
        warn.mockRestore()
      }
    })

    const { reactivity } = adapter
    if (reactivity) {
      it('re-resolves the host tag and void diagnostic after a polymorphic element change', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
          const results = await reactivity([
            {
              as: 'div',
              displayProps: { flex: true },
              className: 'flex-col grid-cols-3 gap-4 rounded',
            },
            {
              as: 'img',
              displayProps: { flex: true },
              className: 'flex-col grid-cols-3 gap-4 rounded',
            },
            {
              as: 'section',
              displayProps: { flex: true },
              className: 'flex-col rounded-lg',
            },
          ])

          expect(results.map((result) => result.tagName)).toEqual(['div', 'img', 'section'])
          expectFlexResolution(results[0]!)
          expectFlexResolution(results[1]!)
          const finalTokens = tokensOf(results[2]!.className)
          expect(finalTokens).toContain('base')
          expect(finalTokens).toContain('flex')
          expect(finalTokens).toContain('flex-col')
          expect(finalTokens).toContain('rounded-lg')
          expect(finalTokens).not.toContain('rounded')
          expect(finalTokens).not.toContain('grid-cols-3')
          expect(results[2]!.flexAttribute).toBeNull()
          expect(warn).toHaveBeenCalledWith(expect.stringContaining('<img>'))
          expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('<section>'))
        } finally {
          warn.mockRestore()
        }
      })
    }
  })
}
