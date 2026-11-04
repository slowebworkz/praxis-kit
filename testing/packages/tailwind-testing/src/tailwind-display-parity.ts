import { describe, expect, it } from 'vitest'
import type { StringMap } from '@praxis-kit/primitive'
import {
  CALLER_MIXED,
  CALLER_MIXED_WITH_GAP,
  expectContains,
  tokensOf,
  withWarnSpy,
} from './helpers'

/**
 * What a renderer is asked to mount: a component built with `createTailwindPipeline` and a
 * base class, given boolean display shorthands plus an optional (possibly conflicting) `layout`
 * and a caller class string. `baseClassName` overrides the default `base` class for focused tests.
 */
export type TailwindDisplayInput = {
  /** Underlying element tag; defaults to div. Void-element parity uses img/input. */
  readonly tag?: string
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
  readonly reactivity?: (
    steps: readonly TailwindDisplayReactivityStep[],
  ) => Promise<readonly string[]>
  /**
   * One renderer per way an adapter accepts props. Most adapters have a single path (`props`);
   * the element adapters (Lit, Web) have `attribute` and `property`.
   */
  readonly renderers: Readonly<Record<string, TailwindDisplayRenderer>>
}

/**
 * The utilities each fixture variant and compound contributes, kept as arrays so the fixtures below
 * and the assertions that expect (or expect to filter) them are derived from the same source.
 */
const FLEX_TONE_UTILITIES = ['flex-col', 'md:flex-row', 'hover:flex-col', '!flex-col'] as const
const GRID_TONE_UTILITIES = [
  'grid-cols-3',
  'md:grid-cols-2',
  'hover:grid-cols-2',
  '!grid-cols-3',
] as const
const FLEX_COMPOUND_UTILITIES = ['lg:flex-row', 'md:!flex-col'] as const
const GRID_COMPOUND_UTILITIES = ['lg:grid-cols-4', 'md:!grid-cols-5'] as const

/** Responsive and state utilities a caller adds on top of the fixtures, used as input and expectation. */
const CALLER_FLEX_UTILITIES = ['md:flex-row', 'hover:flex-row'] as const
const CALLER_GRID_UTILITIES = ['md:grid-cols-4', 'hover:grid-cols-4'] as const

/**
 * Shared style variants used by the cross-adapter suite. These deliberately mix flex/grid
 * container utilities with responsive, state, and important modifiers so the Tailwind plugin
 * must filter them after variant and compound resolution.
 */
export const TAILWIND_DISPLAY_PARITY_VARIANTS = {
  tone: {
    flex: [...FLEX_TONE_UTILITIES, 'gap-4'].join(' '),
    grid: [...GRID_TONE_UTILITIES, 'gap-4'].join(' '),
    plain: 'rounded',
  },
  size: {
    sm: 'p-2',
    lg: 'p-4',
  },
} as const

export const TAILWIND_DISPLAY_PARITY_COMPOUNDS = [
  { tone: 'grid', size: 'lg', class: GRID_COMPOUND_UTILITIES.join(' ') },
  { tone: 'flex', size: 'lg', class: FLEX_COMPOUND_UTILITIES.join(' ') },
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
 * Which caller utilities survive for each display family. A `flex`/`grid` display keeps its own
 * family's utilities (and the shared `gap-*`) and drops the other family's; every other display
 * mode (`block`, `hidden`, `none`, ...) drops both.
 */
const FAMILY_UTILITIES = {
  flex: { has: ['flex-col', 'gap-4', 'md:gap-4'], lacks: ['grid-cols-3'] },
  grid: { has: ['grid-cols-3', 'gap-4', 'md:gap-4'], lacks: ['flex-col'] },
  none: { has: [], lacks: ['flex-col', 'grid-cols-3', 'gap-4', 'md:gap-4'] },
} as const

/** Responsive variants of the family utilities; `md:flex-row` / `md:grid-cols-2` are not display literals. */
const FAMILY_RESPONSIVE_UTILITIES = {
  flex: { has: ['md:flex-row'], lacks: ['md:grid-cols-2'] },
  grid: { has: ['md:grid-cols-2'], lacks: ['md:flex-row'] },
  none: { has: [], lacks: ['md:flex-row', 'md:grid-cols-2'] },
} as const

type DisplayFamily = keyof typeof FAMILY_UTILITIES

function expectFamilyUtilities(
  tokens: readonly string[],
  family: DisplayFamily,
  { responsive = false }: { responsive?: boolean } = {},
): void {
  const base = FAMILY_UTILITIES[family]
  const extra = responsive ? FAMILY_RESPONSIVE_UTILITIES[family] : { has: [], lacks: [] }
  expectContains(tokens, {
    has: [...base.has, ...extra.has],
    lacks: [...base.lacks, ...extra.lacks],
  })
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
          { displayProps: { flex: true }, className: CALLER_MIXED },
          { displayProps: { grid: true }, className: CALLER_MIXED },
          { displayProps: { block: true }, className: CALLER_MIXED },
          { displayProps: { block: true }, className: 'p-4 rounded-lg' },
          { displayProps: { flex: true }, layout: 'grid', className: 'grid-cols-2 p-2' },
        ])
        expect(snapshots).toHaveLength(5)
        const tokens = snapshots.map(tokensOf)
        expectContains(tokens[0]!, { has: ['flex', 'flex-col'], lacks: ['grid-cols-3'] })
        expectContains(tokens[1]!, { has: ['grid', 'grid-cols-3'], lacks: ['flex-col'] })
        expectContains(tokens[2]!, { has: ['block'], lacks: ['flex-col', 'grid-cols-3'] })
        expectContains(tokens[3]!, { has: ['p-4', 'rounded-lg'], lacks: ['rounded', 'p-2'] })
        expectContains(tokens[4]!, { has: ['grid', 'grid-cols-2'], lacks: ['flex', 'flex-col'] })
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
            className: CALLER_MIXED,
          },
          {
            displayProps: {},
            className: CALLER_MIXED,
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

        expectContains(tokens[0]!, { has: ['grid', 'grid-cols-2'], lacks: ['flex-col'] })

        // Removing layout falls back to the still-present boolean shorthand.
        expectContains(tokens[1]!, { has: ['flex', 'flex-col'], lacks: ['grid-cols-3'] })

        // Clearing all display shorthands removes the injected display and family utilities.
        expectContains(tokens[2]!, { lacks: ['flex', 'grid', 'flex-col', 'grid-cols-3'] })

        // Caller-class replacement and removal must not leave prior classes behind.
        expectContains(tokens[3]!, {
          has: ['flex-col', 'rounded'],
          lacks: ['rounded-lg', 'grid-cols-3'],
        })
        // Omitting className drops every caller class; only the base and selected display remain.
        expect([...tokens[4]!].sort()).toEqual(['base', 'flex'])
      })
    }
    for (const [path, render] of Object.entries(adapter.renderers)) {
      describe(`via ${path}`, () => {
        // The void-element warning only reports that the layout is ineffective; it does not remove
        // utilities. Ordinary display-family filtering still applies, so compatible utilities
        // (e.g. `gap-4`) stay in the class list even though they do nothing on a void element.
        it.each([
          { tag: 'img', prop: 'flex' },
          { tag: 'input', prop: 'grid' },
        ])(
          'warns for $prop on void <$tag> without removing family-compatible utilities',
          async ({ tag, prop }) => {
            await withWarnSpy(async (warn) => {
              const className = await render({
                tag,
                displayProps: { [prop]: true },
                className: CALLER_MIXED_WITH_GAP,
              })
              const tokens = tokensOf(className)
              expectContains(tokens, { has: [prop, 'rounded'] })
              expect(warn).toHaveBeenCalledWith(expect.stringContaining(`<${tag}>`))
              expect(warn).toHaveBeenCalledWith(expect.stringContaining(`"${prop}"`))
              // Family filtering is unchanged by the warning: the other family's utilities are
              // dropped, while the selected family's (and shared `gap-4`) are kept.
              if (prop === 'flex') {
                expectContains(tokens, { has: ['flex-col', 'gap-4'], lacks: ['grid-cols-3'] })
              } else {
                expectContains(tokens, { has: ['grid-cols-3', 'gap-4'], lacks: ['flex-col'] })
              }
            })
          },
        )

        it('does not warn for neutral display on a void element', async () => {
          await withWarnSpy(async (warn) => {
            const tokens = tokensOf(
              await render({
                tag: 'img',
                displayProps: { block: true },
                className: CALLER_MIXED,
              }),
            )
            expectContains(tokens, {
              has: ['block', 'rounded'],
              lacks: ['flex-col', 'grid-cols-3'],
            })
            // Only the void-element layout warning is under test; element adapters may log unrelated
            // contract warnings (e.g. Lit's marker nodes inside a void tag).
            expect(warn).not.toHaveBeenCalledWith(
              expect.stringContaining('can never have children'),
            )
          })
        })

        it('uses explicit layout over a conflicting boolean and filters the same utilities', async () => {
          const tokens = tokensOf(
            await render({
              displayProps: { flex: true },
              layout: 'grid',
              className: DISPLAY_CLASSES,
            }),
          )

          expectContains(tokens, { has: ['grid', ...PRESERVED], lacks: ['flex', ...FILTERED] })
        })

        it('filters responsive display literals while preserving flex-mode utilities', async () => {
          const className = await render({
            displayProps: { flex: true },
            layout: 'flex',
            className:
              'md:flex hover:flex md:hidden md:grid md:grid-cols-3 flex-row md:flex-row !flex flex! md:!flex md:flex! md:!flex-col rounded',
          })
          const tokens = tokensOf(className)

          expectContains(tokens, {
            has: [
              'flex',
              'flex-row',
              'md:flex-row',
              '!flex',
              'flex!',
              'md:!flex',
              'md:flex!',
              'md:!flex-col',
              'rounded',
              'base',
            ],
            lacks: ['md:flex', 'hover:flex', 'md:hidden', 'md:grid', 'md:grid-cols-3'],
          })
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
            expectContains(tokens, { lacks: ['md:flex', 'md:grid'] })

            // Family utilities (including their responsive variants) survive only in their own family.
            expectFamilyUtilities(tokens, family, { responsive: true })

            expectContains(tokens, { has: ['base', 'rounded'] })
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

            expectContains(tokens, { has: [prop, 'base', 'rounded'] })
            expectFamilyUtilities(tokens, family)
          },
        )

        it('uses canonical layout-key order and warns when multiple shorthand props are active', async () => {
          await withWarnSpy(async (warn) => {
            const tokens = tokensOf(
              await render({
                // Deliberately reverse the canonical order to prove resolution does not depend on
                // caller object insertion order: `flex` precedes `inline-flex` and `grid`.
                displayProps: { grid: true, 'inline-flex': true, flex: true },
                className: CALLER_MIXED_WITH_GAP,
              }),
            )

            expectContains(tokens, { has: ['flex', 'flex-col', 'gap-4'], lacks: ['grid-cols-3'] })
            expect(warn).toHaveBeenCalledWith(
              expect.stringContaining('Multiple display props set (flex, inline-flex, grid)'),
            )
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('"flex" takes precedence'))
          })
        })

        it('lets a valid explicit layout override conflicting shorthand props without a conflict warning', async () => {
          await withWarnSpy(async (warn) => {
            const tokens = tokensOf(
              await render({
                displayProps: { flex: true, grid: true },
                layout: 'grid',
                className: CALLER_MIXED_WITH_GAP,
              }),
            )

            expectContains(tokens, { has: ['grid', 'grid-cols-3'], lacks: ['flex', 'flex-col'] })
            expect(warn).not.toHaveBeenCalledWith(
              expect.stringContaining('Multiple display props set'),
            )
          })
        })

        it('falls back from an invalid explicit layout to shorthand precedence', async () => {
          await withWarnSpy(async (warn) => {
            const tokens = tokensOf(
              await render({
                displayProps: { grid: true, flex: true },
                layout: 'mystery',
                className: CALLER_MIXED_WITH_GAP,
              }),
            )

            expectContains(tokens, { has: ['flex', 'flex-col'], lacks: ['grid-cols-3'] })
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid layout value'))
            expect(warn).toHaveBeenCalledWith(
              expect.stringContaining('Multiple display props set (flex, grid)'),
            )
          })
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

            expectContains(tokens, { has: ['base', 'rounded', 'p-4'] })

            if (family === 'flex') {
              expectContains(tokens, {
                has: ['flex', 'flex-col', 'md:flex-row', 'gap-4'],
                lacks: [
                  'grid',
                  'grid-cols-3',
                  'md:grid-cols-2',
                  '!grid-cols-3',
                  'md:!grid-cols-2',
                  'md:flex',
                  'hover:grid',
                ],
              })
              // Important display utilities are intentional escape hatches and survive filtering.
              expectContains(tokens, { has: ['!grid', 'md:!grid'] })
            } else if (family === 'grid') {
              expectContains(tokens, {
                has: ['grid', 'grid-cols-3', 'md:grid-cols-2', 'gap-4', '!flex', 'md:!flex'],
                lacks: [
                  'flex',
                  'flex-col',
                  '!flex-col',
                  'md:flex-row',
                  'md:!flex-row',
                  'md:flex',
                  'md:grid',
                ],
              })
            } else {
              // Item utilities are parent-layout dependent and intentionally remain untouched.
              expectContains(tokens, {
                has: ['self-center'],
                lacks: [
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
                ],
              })
            }
          },
        )

        it('composes grid variants and matching compounds before filtering compatible utilities', async () => {
          const tokens = tokensOf(
            await render({
              displayProps: {},
              layout: 'grid',
              variantProps: { tone: 'grid', size: 'lg' },
              className: ['rounded', ...CALLER_GRID_UTILITIES, 'p-4'].join(' '),
            }),
          )

          expectContains(tokens, {
            has: [
              'grid',
              ...GRID_TONE_UTILITIES,
              ...GRID_COMPOUND_UTILITIES,
              ...CALLER_GRID_UTILITIES,
              'p-4',
              'rounded',
            ],
          })
        })

        it('filters responsive, state, and important grid utilities from variants and compounds in flex mode', async () => {
          const tokens = tokensOf(
            await render({
              displayProps: {},
              layout: 'flex',
              variantProps: { tone: 'grid', size: 'lg' },
              className: [...CALLER_GRID_UTILITIES, 'rounded'].join(' '),
            }),
          )

          expectContains(tokens, {
            has: ['flex', 'gap-4', 'p-4', 'rounded'],
            lacks: [...GRID_TONE_UTILITIES, ...GRID_COMPOUND_UTILITIES, ...CALLER_GRID_UTILITIES],
          })
        })

        it('filters responsive, state, and important flex utilities from variants and compounds in grid mode', async () => {
          const tokens = tokensOf(
            await render({
              displayProps: {},
              layout: 'grid',
              variantProps: { tone: 'flex', size: 'lg' },
              className: [...CALLER_FLEX_UTILITIES, 'rounded'].join(' '),
            }),
          )

          expectContains(tokens, {
            has: ['grid', 'p-4', 'rounded'],
            lacks: [...FLEX_TONE_UTILITIES, ...FLEX_COMPOUND_UTILITIES, ...CALLER_FLEX_UTILITIES],
          })
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

          expectContains(tokens, {
            has: ['grid-cols-3', 'md:grid-cols-2', 'p-2'],
            lacks: ['p-4', ...GRID_COMPOUND_UTILITIES],
          })
        })

        it.each(INVALID_LAYOUT_VALUES)(
          'falls back to boolean layout for invalid value %j',
          async (layout) => {
            await withWarnSpy(async (warn) => {
              const className = await render({
                displayProps: { flex: true },
                layout,
                className: CALLER_MIXED,
              })
              const tokens = tokensOf(className)

              // The invalid value itself must not leak into the class list (nor an empty token).
              expectContains(tokens, {
                has: ['flex', 'flex-col', 'rounded'],
                lacks: ['grid-cols-3', '', ...(layout === '' ? [] : [layout])],
              })
              expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid layout value'))
            })
          },
        )
      })
    }
  })
}
