import type { LAYOUT_FAMILY_MAP } from './constants'
import type { LayoutFamily } from './types/layout'

export type DependencyRules = Record<
  Exclude<LayoutFamily<typeof LAYOUT_FAMILY_MAP>, 'none'>,
  readonly RegExp[]
>

// Stripping is RESEMBLANCE-based, by design. A class is stripped under a
// conflicting layout mode because its name matches one of these prefixes, NOT
// because it's verified to be a real Tailwind utility that resolves to a
// grid/flex style. So `grid-triplets-1` (not a valid Tailwind class) is stripped
// in flex mode purely because it resembles a grid utility. This is the accepted
// break point: the plugin does not resolve against the Tailwind config. Don't
// name custom classes after these prefixes if they must survive a mode switch.
export const defaultDependencyRules: DependencyRules = {
  flex: [/^flex-/, /^grow/, /^shrink/, /^basis-/],
  grid: [
    /^grid-/,
    /^col-/,
    /^row-/,
    /^auto-cols-/,
    /^auto-rows-/,
    // justify-items/-self are no-ops on flex containers per the CSS box
    // alignment spec (flex items ignore them), so treat as grid-only.
    /^justify-items-/,
    /^justify-self-/,
  ],
} as const
