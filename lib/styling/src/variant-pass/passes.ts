import type { Pass } from '@praxis-kit/pipeline'
import type { StyleContext } from './types'

export const basePass: Pass<StyleContext> = {
  name: 'base',
  execute() {
    return { context: { classes: ['inline-flex'] } }
  },
}

export const hoverPass: Pass<StyleContext> = {
  name: 'hover',
  execute() {
    return { context: { classes: ['hover:bg-blue-500'] } }
  },
}

export const focusPass: Pass<StyleContext> = {
  name: 'focus',
  execute() {
    return { context: { classes: ['focus:ring'] } }
  },
}
