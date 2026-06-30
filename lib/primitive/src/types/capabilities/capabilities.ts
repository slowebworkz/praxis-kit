import type { Diagnostics } from '@praxis-kit/diagnostics'

export type Capabilities = {
  readonly createClassPipeline?: (
    opts: Record<string, unknown>,
  ) => (props: Record<string, unknown>) => string
  readonly AriaEngine?: new (
    diagnostics?: Diagnostics,
    options?: { rules?: readonly unknown[] },
  ) => object
}
