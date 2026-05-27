import { assertNever } from '@praxis-ui/core'
import type { ClassifiedToken } from './types/classified-token'

export class ClassBuilder {
  build(tokens: ClassifiedToken[]): string {
    const layout: string[] = []
    const normal: string[] = []

    for (const token of tokens) {
      switch (token.kind) {
        case 'layout': {
          layout.push(token.raw)
          break
        }

        case 'utility':
        case 'gap':
        case 'conditional': {
          normal.push(token.raw)
          break
        }

        default:
          return assertNever(token)
      }
    }

    return [...this.#dedupe(layout).toSorted(), ...this.#dedupe(normal)].join(' ')
  }

  #dedupe(arr: string[]): string[] {
    return [...new Set(arr)]
  }
}
