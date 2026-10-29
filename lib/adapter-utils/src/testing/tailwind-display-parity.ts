import { describe, expect, it, vi } from 'vitest'

/**
 * What a renderer is asked to mount: a component built with `createTailwindPipeline` and a
 * `base` class, given the boolean `flex` shorthand plus a (possibly conflicting) `layout` and a
 * caller class string.
 */
export type TailwindDisplayInput = {
  /** Always `true`: `flex` is the boolean shorthand; `layout` takes precedence or falls back. */
  readonly flex: true
  readonly layout: string
  readonly className: string
}

/**
 * Mounts the component for one adapter input path and returns the host element's resulting
 * `class` attribute. The component must be created with `styling: { base: 'base', plugin:
 * createTailwindPipeline }` so the suite can assert the base class survives.
 */
export type TailwindDisplayRenderer = (input: TailwindDisplayInput) => string | Promise<string>

export type TailwindDisplayParityAdapter = {
  /**
   * One renderer per way an adapter accepts props. Most adapters have a single path (`props`);
   * the element adapters (Lit, Web) have `attribute` and `property`.
   */
  readonly renderers: Readonly<Record<string, TailwindDisplayRenderer>>
}

/** A class string covering every kind of token the pipeline treats differently. */
const DISPLAY_CLASSES = [
  'md:flex',
  'hover:flex',
  'md:hidden',
  'md:grid-cols-3',
  'md:flex-row',
  '!flex',
  'flex!',
  'md:!flex',
  'md:flex!',
  'rounded',
].join(' ')

/** Responsive and state-prefixed display literals are filtered (they must not replace the base). */
const FILTERED = ['md:flex', 'hover:flex', 'md:hidden', 'md:flex-row']

/** Compatible utilities, the component's own base class, and the important escape hatches. */
const PRESERVED = ['base', 'md:grid-cols-3', '!flex', 'flex!', 'md:!flex', 'md:flex!', 'rounded']

/** Runtime values that are not a display value; the pipeline must warn and ignore them. */
const INVALID_LAYOUT_VALUES = ['mystery', ''] as const

function tokensOf(className: string): string[] {
  return className.split(/\s+/)
}

/**
 * Tailwind display parity suite. Verifies that every adapter, through each of its input paths,
 * resolves the single-valued `layout` prop the same way: it overrides a conflicting boolean
 * shorthand, prefixed display literals are filtered, important variants pass through, and an
 * invalid value warns and falls back to the boolean shorthand.
 *
 * Run in a `// @vitest-environment jsdom` test file.
 */
export function tailwindDisplayParitySuite(adapter: TailwindDisplayParityAdapter): void {
  describe('Tailwind display parity', () => {
    for (const [path, render] of Object.entries(adapter.renderers)) {
      describe(`via ${path}`, () => {
        it('uses explicit layout over a conflicting boolean and filters the same utilities', async () => {
          const tokens = tokensOf(
            await render({ flex: true, layout: 'grid', className: DISPLAY_CLASSES }),
          )

          expect(tokens).toContain('grid')
          expect(tokens).not.toContain('flex')
          for (const filtered of FILTERED) expect(tokens).not.toContain(filtered)
          for (const preserved of PRESERVED) expect(tokens).toContain(preserved)
        })

        it('uses hidden as an explicit display value over the boolean shorthand', async () => {
          const className = await render({
            flex: true,
            layout: 'hidden',
            className: 'flex-col grid-cols-3 gap-4 rounded',
          })
          const tokens = tokensOf(className)

          expect(tokens).toContain('hidden')
          expect(tokens).not.toContain('flex')
          expect(tokens).not.toContain('flex-col')
          expect(tokens).not.toContain('grid-cols-3')
          expect(tokens).not.toContain('gap-4')
          expect(tokens).toContain('base')
          expect(tokens).toContain('rounded')
        })

        it.each(INVALID_LAYOUT_VALUES)(
          'falls back to boolean layout for invalid value %j',
          async (layout) => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
            try {
              const className = await render({
                flex: true,
                layout,
                className: 'flex-col grid-cols-3 rounded',
              })
              const tokens = tokensOf(className)

              // Check raw output: splitting on whitespace hides repeated spaces.
              expect(className).not.toMatch(/^\s|\s$|\s{2,}/)
              expect(tokens).toContain('flex')
              expect(tokens).toContain('flex-col')
              expect(tokens).toContain('rounded')
              expect(tokens).not.toContain('grid-cols-3')
              expect(tokens).not.toContain('')
              if (layout !== '') expect(tokens).not.toContain(layout)
              expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid layout value'))
            } finally {
              warn.mockRestore()
            }
          },
        )
      })
    }
  })
}
