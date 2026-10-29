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

/**
 * Responsive and state-prefixed display literals (`md:flex`, `hover:flex`, `md:hidden`) are
 * filtered so they cannot replace the selected display, as are utilities incompatible with the
 * selected `grid` layout family (`md:flex-row` is a flex-direction utility, not a display literal).
 */
const FILTERED = ['md:flex', 'hover:flex', 'md:hidden', 'md:flex-row']

/** Compatible utilities, the component's own base class, and the important escape hatches. */
const PRESERVED = ['base', 'md:grid-cols-3', '!flex', 'flex!', 'md:!flex', 'md:flex!', 'rounded']

/** Runtime values that are not a display value; the pipeline must warn and ignore them. */
const INVALID_LAYOUT_VALUES = ['mystery', ''] as const

/**
 * Splits a rendered class attribute into tokens after asserting it is canonical: no leading,
 * trailing or repeated whitespace (splitting alone would hide those) and no duplicate tokens.
 * Exact ordering is left unasserted, since adapters may merge classes in different orders.
 */
function tokensOf(className: string): string[] {
  expect(className).not.toMatch(/^\s|\s$|\s{2,}/)
  const tokens = className.split(/\s+/)
  expect(tokens).toEqual([...new Set(tokens)])
  return tokens
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

        it('filters responsive display literals while preserving flex-mode utilities', async () => {
          const className = await render({
            flex: true,
            layout: 'flex',
            className:
              'md:flex hover:flex md:hidden md:grid md:grid-cols-3 flex-row md:flex-row !flex flex! md:!flex md:flex! md:!flex-col rounded',
          })
          const tokens = tokensOf(className)

          expect(tokens).toContain('flex')
          expect(tokens).toContain('flex-row')
          expect(tokens).toContain('md:flex-row')
          expect(tokens).not.toContain('md:flex')
          expect(tokens).not.toContain('hover:flex')
          expect(tokens).not.toContain('md:hidden')
          expect(tokens).not.toContain('md:grid')
          expect(tokens).not.toContain('md:grid-cols-3')
          expect(tokens).toContain('!flex')
          expect(tokens).toContain('flex!')
          expect(tokens).toContain('md:!flex')
          expect(tokens).toContain('md:flex!')
          expect(tokens).toContain('md:!flex-col')
          expect(tokens).toContain('rounded')
          expect(tokens).toContain('base')
        })

        // Keep this matrix aligned with `layoutKeys` in `lib/tailwind/src/layout-keys.ts`.
        // adapter-utils intentionally does not depend on the Tailwind package, so the shared
        // suite lists the public display values locally rather than importing its implementation.
        it.each([
          { layout: 'flex', family: 'flex' },
          { layout: 'inline-flex', family: 'flex' },
          { layout: 'grid', family: 'grid' },
          { layout: 'inline-grid', family: 'grid' },
          { layout: 'block', family: 'none' },
          { layout: 'inline-block', family: 'none' },
          { layout: 'inline', family: 'none' },
          { layout: 'hidden', family: 'none' },
          { layout: 'contents', family: 'none' },
          { layout: 'flow-root', family: 'none' },
          { layout: 'list-item', family: 'none' },
          { layout: 'table', family: 'none' },
          { layout: 'inline-table', family: 'none' },
          { layout: 'table-caption', family: 'none' },
          { layout: 'table-cell', family: 'none' },
          { layout: 'table-column', family: 'none' },
          { layout: 'table-column-group', family: 'none' },
          { layout: 'table-footer-group', family: 'none' },
          { layout: 'table-header-group', family: 'none' },
          { layout: 'table-row-group', family: 'none' },
          { layout: 'table-row', family: 'none' },
          { layout: 'none', family: 'none' },
        ] as const)(
          'resolves explicit $layout across display utility families',
          async ({ layout, family }) => {
            const tokens = tokensOf(
              await render({
                flex: true,
                layout,
                className:
                  'flex grid flex-col grid-cols-3 gap-4 md:gap-4 md:flex md:grid md:flex-row md:grid-cols-2 rounded',
              }),
            )

            // `none` is the pipeline's no-display state and intentionally injects no class.
            if (layout === 'none') {
              expect(tokens).not.toContain('none')
            } else {
              expect(tokens).toContain(layout)
            }

            // Caller display literals are filtered; the selected mode is injected by the pipeline.
            if (layout !== 'flex') expect(tokens).not.toContain('flex')
            if (layout !== 'grid') expect(tokens).not.toContain('grid')
            expect(tokens).not.toContain('md:flex')
            expect(tokens).not.toContain('md:grid')

            // Family utilities (including their responsive variants) survive only in their own
            // family; `md:flex-row` / `md:grid-cols-2` are not display literals.
            if (family === 'flex') {
              expect(tokens).toContain('flex-col')
              expect(tokens).toContain('md:flex-row')
              expect(tokens).toContain('gap-4')
              expect(tokens).toContain('md:gap-4')
              expect(tokens).not.toContain('grid-cols-3')
              expect(tokens).not.toContain('md:grid-cols-2')
            } else if (family === 'grid') {
              expect(tokens).toContain('grid-cols-3')
              expect(tokens).toContain('md:grid-cols-2')
              expect(tokens).toContain('gap-4')
              expect(tokens).toContain('md:gap-4')
              expect(tokens).not.toContain('flex-col')
              expect(tokens).not.toContain('md:flex-row')
            } else {
              expect(tokens).not.toContain('flex-col')
              expect(tokens).not.toContain('md:flex-row')
              expect(tokens).not.toContain('grid-cols-3')
              expect(tokens).not.toContain('md:grid-cols-2')
              expect(tokens).not.toContain('gap-4')
              expect(tokens).not.toContain('md:gap-4')
            }

            expect(tokens).toContain('base')
            expect(tokens).toContain('rounded')
          },
        )

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
