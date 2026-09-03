import type { RuntimeContext } from './runtime-context'

export interface Backend<TOutput> {
  render(context: RuntimeContext): TOutput
}
