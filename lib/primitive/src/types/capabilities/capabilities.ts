import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { AnyRecord } from '../any-record'

export type Capabilities = {
  readonly createClassPipeline?: (opts: AnyRecord) => (props: AnyRecord) => string
  readonly AriaEngine?: new (
    diagnostics?: Diagnostics,
    options?: { rules?: readonly unknown[] },
  ) => object
}
