/**
 * Box — Tailwind layout component for Vue.
 *
 * `plugin: createTailwindPipeline` activates the layout pipeline, which
 * contributes `flex` and `grid` boolean props. These props act as layout-mode
 * switches — they never reach the DOM — and determine which Tailwind utilities
 * are emitted:
 *
 *   - `flex` — activates flex mode; strips grid-only classes (grid-cols-*, col-*, …)
 *   - `grid` — activates grid mode; strips flex-only classes (flex-*, grow, shrink, …)
 *   - neither — raw CVA output with no filtering
 *
 * Gap classes are kept in both modes and stripped only when no layout mode is active.
 */
import { createPolymorphicComponent } from '@polymorphic-ui/vue'
import { createTailwindPipeline } from '@polymorphic-ui/tailwind'

const variants = {
  direction: {
    row: 'flex-row',
    col: 'flex-col',
  },
  align: {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  },
  gap: {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-8',
  },
  cols: {
    '2': 'grid-cols-2',
    '3': 'grid-cols-3',
    '4': 'grid-cols-4',
  },
} as const

export const Box = createPolymorphicComponent<'div', Record<never, never>, typeof variants>({
  tag: 'div',
  name: 'Box',
  styling: {
    plugin: createTailwindPipeline,
    variants,
    presets: {
      row: { direction: 'row', align: 'center', gap: 'md' },
      stack: { direction: 'col', gap: 'sm' },
      grid2: { cols: '2', gap: 'md' },
    },
  },
  filterProps: (key: string, variantKeys: ReadonlySet<string>) => variantKeys.has(key),
})
