import type { Plugin } from '@pk2/pipeline'
import type { StyleContext } from '@pk2/style'
import { tailwindPass } from './tailwind-pass'

export const TAILWIND_NODE = 'tailwind'

export const tailwindPlugin: Plugin<StyleContext> = {
  name: 'tailwind',
  nodes: new Map([[TAILWIND_NODE, tailwindPass]]),
}
