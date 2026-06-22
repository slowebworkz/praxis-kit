import type { Pass } from '@pk2/pipeline'
import type { StyleContext } from '@pk2/style'

export const tailwindPass: Pass<StyleContext> = {
  name: 'tailwind',
  execute() {
    return {
      context: {
        classes: ['bg-blue-500', 'text-white'],
      },
    }
  },
}
