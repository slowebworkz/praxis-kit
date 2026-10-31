import { describe, expect, it, vi } from 'vitest'
import type { StringMap } from '@praxis-kit/primitive'

/**
 * What a renderer is asked to mount: a component built with `createTailwindPipeline` and a
 * base class, given boolean display shorthands plus an optional (possibly conflicting) `layout`
 * and a caller class string. `baseClassName` overrides the default `base` class for focused tests.
 */
export type TailwindDisplayInput = {
  /** Boolean display shorthands; when multiple are true, canonical `layoutKeys` order wins. */
  readonly displayProps: Readonly<StringMap<boolean>>
  /** Omit to resolve from boolean display shorthands. Invalid values also fall back to shorthands. */
  readonly layout?: string
  /** Optional override for the component's configured base classes, used by base-parity cases. */
  readonly baseClassName?: string
  /** Optional style-variant selections used to exercise variant and compound composition. */
  readonly variantProps?: Readonly<StringMap<string>>
  readonly className: string
}

/**
 * Mounts the component for one adapter input path and returns the host element's resulting
 * `class` attribute. The component must be created with `styling: { base: 'base', plugin:
 * createTailwindPipeline }` so the suite can assert the base class survives.
 */
export type TailwindDisplayRenderer = (input: TailwindDisplayInput) => string | Promise<string>

export type TailwindDisplayReactivityStep = {
  /** Omitted props are removed from the mounted component; an empty map clears all shorthands. */
  readonly displayProps?: Readonly<StringMap<boolean>>
  /** Omission removes the explicit layout prop. */
  readonly layout?: string
  /** Omission removes the caller class prop. */
  readonly className?: string
}

export type TailwindDisplayParityAdapter = {
  /** Mount once, apply each step to the same instance, and return className after every update. */
  readonly reactivity?: (steps: readonly TailwindDisplayReactivityStep[]) => Promise<readonly string[]>
  /**
   * One renderer per way an adapter accepts props. Most adapters have a single path (`props`);
   * the element adapters (Lit, Web) have `attribute` and `property`.
   */
  readonly renderers: Readonly<Record<string, TailwindDisplayRenderer>>
}

/**
 * Shared style variants used by the cross-adapter suite. These deliberately mix flex/grid
 * container utilities with responsive, state, and important modifiers so the Tailwind plugin
 * must filter them after variant and compound resolution.
 */
export const TAILWIND_DISPLAY_PARITY_VARIANTS = {
  tone: {
    flex: 'flex-col md:flex-row hover:flex-col !flex-col gap-4',
    grid: 'grid-cols-3 md:grid-cols-2 hover:grid-cols-2 !grid-cols-3 gap-4',
    plain: 'rounded',
  },
  size: {
    sm: 'p-2',
    lg: 'p-4',
  },
} as const

export const TAILWIND_DISPLAY_PARITY_COMPOUNDS = [
  { tone: 'grid', size: 'lg', class: 'lg:grid-cols-4 md:!grid-cols-5' },
  { tone: 'flex', size: 'lg', class: 'lg:flex-row md:!flex-col' },
] as const

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
 * resolves boolean display shorthands consistently, including canonical precedence for conflicts;
 * explicit `layout` overrides shorthands, prefixed display literals are filtered, important
 * variants pass through, and invalid `layout` values warn and fall back to shorthands.
 *
 * Run in a `// @vitest-environment jsdom` test file.
 */
export function tailwindDisplayParitySuite(adapter: TailwindDisplayParityAdapter): void {
  describe('Tailwind display parity', () => {
    const { reactivity } = adapter
    if (reactivity) {
      it('updates display and caller classes without retaining stale utilities', async () => {
        const snapshots = await reactivity([
          { displayProps: { flex: true }, className: 'flex-col grid-cols-3 rounded' },
          { displayProps: { grid: true }, className: 'flex-col grid-cols-3 rounded' },
          { displayProps: { block: true }, className: 'flex-col grid-cols-3 rounded' },
          { displayProps: { block: true }, className: 'p-4 rounded-lg' },
          { displayProps: { flex: true }, layout: 'grid', className: 'grid-cols-2 p-2' },
        ])
        expect(snapshots).toHaveLength(5)
        const tokens = snapshots.map(tokensOf)
        expect(tokens[0]).toContain('flex')
        expect(tokens[0]).toContain('flex-col')
        expect(tokens[0]).not.toContain('grid-cols-3')
        expect(tokens[1]).toContain('grid')
        expect(tokens[1]).toContain('grid-cols-3')
        expect(tokens[1]).not.toContain('flex-col')
        expect(tokens[2]).toContain('block')
        expect(tokens[2]).not.toContain('flex-col')
        expect(tokens[2]).not.toContain('grid-cols-3')
        expect(tokens[3]).toContain('p-4')
        expect(tokens[3]).toContain('rounded-lg')
        expect(tokens[3]).not.toContain('rounded')
        expect(tokens[3]).not.toContain('p-2')
        expect(tokens[4]).toContain('grid')
        expect(tokens[4]).toContain('grid-cols-2')
        expect(tokens[4]).not.toContain('flex')
        expect(tokens[4]).not.toContain('flex-col')
        for (const snapshot of tokens) expect(snapshot).toContain('base')
      })

      it('resets explicit layout, shorthand props, and caller classes without stale utilities', async () => {
        const snapshots = await reactivity([
          {
            displayProps: { grid: true },
            layout: 'grid',
            className: 'grid-cols-2 flex-col rounded-lg',
          },
          {
            displayProps: { flex: true },
            className: 'flex-col grid-cols-3 rounded',
          },
          {
            displayProps: {},
            className: 'flex-col grid-cols-3 rounded',
          },
          {
            displayProps: { flex: true },
            className: 'flex-col rounded',
          },
          {
            displayProps: { flex: true },
          },
        ])
        expect(snapshots).toHaveLength(5)
        const tokens = snapshots.map(tokensOf)

        expect(tokens[0]).toContain('grid')
        expect(tokens[0]).toContain('grid-cols-2')
        expect(tokens[0]).not.toContain('flex-col')

        // Removing layout falls back to the still-present boolean shorthand.
        expect(tokens[1]).toContain('flex')
        expect(tokens[1]).toContain('flex-col')
        expect(tokens[1]).not.toContain('grid-cols-3')

        // Clearing all display shorthands removes the injected display and family utilities.
        expect(tokens[2]).not.toContain('flex')
        expect(tokens[2]).not.toContain('grid')
        expect(tokens[2]).not.toContain('flex-col')
        expect(tokens[2]).not.toContain('grid-cols-3')

        // Caller-class replacement and removal must not leave prior classes behind.
        expect(tokens[3]).toContain('flex-col')
        expect(tokens[3]).not.toContain('rounded')
        expect(tokens[3]).not.toContain('rounded-lg')
        expect(tokens[4]).toEqual(['base'])
      })
    }
    for (const [path, render] of Object.entries(adapter.renderers)) {
      describe(`via ${path}`, () => {
        it('uses explicit layout over a conflicting boolean and filters the same utilities', async () => {
          const tokens = tokensOf(
            await render({
              displayProps: { flex: true },
              layout: 'grid',
              className: DISPLAY_CLASSES,
            }),
          )

          expect(tokens).toContain('grid')
          expect(tokens).not.toContain('flex')
          for (const filtered of FILTERED) expect(tokens).not.toContain(filtered)
          for (const preserved of PRESERVED) expect(tokens).toContain(preserved)
        })

        it('filters responsive display literals while preserving flex-mode utilities', async () => {
          const className = await render({
            displayProps: { flex: true },
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
                displayProps: { flex: true },
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

        it.each([
          { prop: 'flex', family: 'flex' },
          { prop: 'inline-flex', family: 'flex' },
          { prop: 'grid', family: 'grid' },
          { prop: 'inline-grid', family: 'grid' },
          { prop: 'block', family: 'none' },
          { prop: 'inline', family: 'none' },
          { prop: 'hidden', family: 'none' },
        ] as const)(
          'resolves the $prop shorthand when layout is omitted',
          async ({ prop, family }) => {
            const tokens = tokensOf(
              await render({
                displayProps: { [prop]: true },
                className: 'flex grid flex-col grid-cols-3 gap-4 md:gap-4 rounded',
              }),
            )

            expect(tokens).toContain(prop)
            expect(tokens).toContain('base')
            expect(tokens).toContain('rounded')
            if (family === 'flex') {
              expect(tokens).toContain('flex-col')
              expect(tokens).toContain('gap-4')
              expect(tokens).toContain('md:gap-4')
              expect(tokens).not.toContain('grid-cols-3')
            } else if (family === 'grid') {
              expect(tokens).toContain('grid-cols-3')
              expect(tokens).toContain('gap-4')
              expect(tokens).toContain('md:gap-4')
              expect(tokens).not.toContain('flex-col')
            } else {
              expect(tokens).not.toContain('flex-col')
              expect(tokens).not.toContain('grid-cols-3')
              expect(tokens).not.toContain('gap-4')
              expect(tokens).not.toContain('md:gap-4')
            }
          },
        )

        it('uses canonical layout-key order and warns when multiple shorthand props are active', async () => {
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
          try {
            const tokens = tokensOf(
              await render({
                // Deliberately reverse the canonical order to prove resolution does not depend on
                // caller object insertion order: `flex` precedes `inline-flex` and `grid`.
                displayProps: { grid: true, 'inline-flex': true, flex: true },
                className: 'flex-col grid-cols-3 gap-4 rounded',
              }),
            )

            expect(tokens).toContain('flex')
            expect(tokens).toContain('flex-col')
            expect(tokens).not.toContain('grid-cols-3')
            expect(tokens).toContain('gap-4')
            expect(warn).toHaveBeenCalledWith(
              expect.stringContaining('Multiple display props set (flex, inline-flex, grid)'),
            )
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('"flex" takes precedence'))
          } finally {
            warn.mockRestore()
          }
        })

        it('lets a valid explicit layout override conflicting shorthand props without a conflict warning', async () => {
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
          try {
            const tokens = tokensOf(
              await render({
                displayProps: { flex: true, grid: true },
                layout: 'grid',
                className: 'flex-col grid-cols-3 gap-4 rounded',
              }),
            )

            expect(tokens).toContain('grid')
            expect(tokens).toContain('grid-cols-3')
            expect(tokens).not.toContain('flex')
            expect(tokens).not.toContain('flex-col')
            expect(warn).not.toHaveBeenCalledWith(
              expect.stringContaining('Multiple display props set'),
            )
          } finally {
            warn.mockRestore()
          }
        })

        it('falls back from an invalid explicit layout to shorthand precedence', async () => {
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
          try {
            const tokens = tokensOf(
              await render({
                displayProps: { grid: true, flex: true },
                layout: 'mystery',
                className: 'flex-col grid-cols-3 gap-4 rounded',
              }),
            )

            expect(tokens).toContain('flex')
            expect(tokens).toContain('flex-col')
            expect(tokens).not.toContain('grid-cols-3')
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid layout value'))
            expect(warn).toHaveBeenCalledWith(
              expect.stringContaining('Multiple display props set (flex, grid)'),
            )
          } finally {
            warn.mockRestore()
          }
        })

        it.each([
          {
            label: 'flex',
            displayProps: { flex: true },
            baseClassName:
              'base grid grid-cols-3 !grid-cols-3 flex-col gap-4 md:grid-cols-2 md:!grid-cols-2 md:flex-row md:flex hover:grid !grid md:!grid rounded',
            family: 'flex',
          },
          {
            label: 'grid',
            displayProps: { grid: true },
            baseClassName:
              'base flex flex-col !flex-col grid-cols-3 gap-4 md:flex-row md:!flex-row md:grid-cols-2 md:grid !flex md:!flex rounded',
            family: 'grid',
          },
          {
            label: 'no display mode',
            displayProps: {},
            baseClassName:
              'base flex grid flex-col grid-cols-3 gap-4 md:flex md:grid justify-between items-center place-content-center justify-items-start self-center rounded',
            family: 'none',
          },
        ] as const)(
          'filters configured base classes correctly for $label and merges caller classes',
          async ({ displayProps, baseClassName, family }) => {
            const tokens = tokensOf(
              await render({
                displayProps,
                baseClassName,
                className: 'rounded p-4 rounded',
              }),
            )

            expect(tokens).toContain('base')
            expect(tokens).toContain('rounded')
            expect(tokens).toContain('p-4')

            if (family === 'flex') {
              expect(tokens).toContain('flex')
              expect(tokens).toContain('flex-col')
              expect(tokens).toContain('md:flex-row')
              expect(tokens).toContain('gap-4')
              expect(tokens).not.toContain('grid')
              expect(tokens).not.toContain('grid-cols-3')
              expect(tokens).not.toContain('md:grid-cols-2')
              expect(tokens).not.toContain('!grid-cols-3')
              expect(tokens).not.toContain('md:!grid-cols-2')
              expect(tokens).not.toContain('md:flex')
              expect(tokens).not.toContain('hover:grid')
              // Important display utilities are intentional escape hatches and survive filtering.
              expect(tokens).toContain('!grid')
              expect(tokens).toContain('md:!grid')
            } else if (family === 'grid') {
              expect(tokens).toContain('grid')
              expect(tokens).toContain('grid-cols-3')
              expect(tokens).toContain('md:grid-cols-2')
              expect(tokens).toContain('gap-4')
              expect(tokens).not.toContain('flex')
              expect(tokens).not.toContain('flex-col')
              expect(tokens).not.toContain('!flex-col')
              expect(tokens).not.toContain('md:flex-row')
              expect(tokens).not.toContain('md:!flex-row')
              expect(tokens).not.toContain('md:flex')
              expect(tokens).not.toContain('md:grid')
              expect(tokens).toContain('!flex')
              expect(tokens).toContain('md:!flex')
            } else {
              for (const filtered of [
                'flex',
                'grid',
                'flex-col',
                'grid-cols-3',
                'gap-4',
                'md:flex',
                'md:grid',
                'justify-between',
                'items-center',
                'place-content-center',
                'justify-items-start',
              ]) {
                expect(tokens).not.toContain(filtered)
              }
              // Item utilities are parent-layout dependent and intentionally remain untouched.
              expect(tokens).toContain('self-center')
            }
          },
        )

        it('composes grid variants and matching compounds before filtering compatible utilities', async () => {
          const tokens = tokensOf(
            await render({
              displayProps: {},
              layout: 'grid',
              variantProps: { tone: 'grid', size: 'lg' },
              className: 'rounded md:grid-cols-4 hover:grid-cols-4 p-4',
            }),
          )

          expect(tokens).toContain('grid')
          expect(tokens).toContain('grid-cols-3')
          expect(tokens).toContain('md:grid-cols-2')
          expect(tokens).toContain('hover:grid-cols-2')
          expect(tokens).toContain('!grid-cols-3')
          expect(tokens).toContain('lg:grid-cols-4')
          expect(tokens).toContain('md:!grid-cols-5')
          expect(tokens).toContain('md:grid-cols-4')
          expect(tokens).toContain('hover:grid-cols-4')
          expect(tokens).toContain('p-4')
          expect(tokens).toContain('rounded')
        })

        it('filters responsive, state, and important grid utilities from variants and compounds in flex mode', async () => {
          const tokens = tokensOf(
            await render({
              displayProps: {},
              layout: 'flex',
              variantProps: { tone: 'grid', size: 'lg' },
              className: 'md:grid-cols-4 hover:grid-cols-4 rounded',
            }),
          )

          expect(tokens).toContain('flex')
          expect(tokens).toContain('gap-4')
          expect(tokens).toContain('p-4')
          expect(tokens).toContain('rounded')
          for (const filtered of [
            'grid-cols-3',
            'md:grid-cols-2',
            'hover:grid-cols-2',
            '!grid-cols-3',
            'lg:grid-cols-4',
            'md:!grid-cols-5',
            'md:grid-cols-4',
            'hover:grid-cols-4',
          ]) {
            expect(tokens).not.toContain(filtered)
          }
        })

        it('filters responsive, state, and important flex utilities from variants and compounds in grid mode', async () => {
          const tokens = tokensOf(
            await render({
              displayProps: {},
              layout: 'grid',
              variantProps: { tone: 'flex', size: 'lg' },
              className: 'md:flex-row hover:flex-row rounded',
            }),
          )

          expect(tokens).toContain('grid')
          expect(tokens).toContain('p-4')
          expect(tokens).toContain('rounded')
          for (const filtered of [
            'flex-col',
            'md:flex-row',
            'hover:flex-col',
            '!flex-col',
            'lg:flex-row',
            'md:!flex-col',
            'hover:flex-row',
          ]) {
            expect(tokens).not.toContain(filtered)
          }
        })

        it('only applies compound classes when all variant dimensions match', async () => {
          const tokens = tokensOf(
            await render({
              displayProps: {},
              layout: 'grid',
              variantProps: { tone: 'grid', size: 'sm' },
              className: 'rounded',
            }),
          )

          expect(tokens).toContain('grid-cols-3')
          expect(tokens).toContain('md:grid-cols-2')
          expect(tokens).toContain('p-2')
          expect(tokens).not.toContain('p-4')
          expect(tokens).not.toContain('lg:grid-cols-4')
          expect(tokens).not.toContain('md:!grid-cols-5')
        })

        it.each(INVALID_LAYOUT_VALUES)(
          'falls back to boolean layout for invalid value %j',
          async (layout) => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
            try {
              const className = await render({
                displayProps: { flex: true },
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
