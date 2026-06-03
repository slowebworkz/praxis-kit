import type { StrictMode } from '../config/strict-mode'

export type Capabilities = {
  readonly createClassPipeline?: (
    opts: Record<string, unknown>,
  ) => (props: Record<string, unknown>) => string
  readonly AriaEngine?: new (
    strict?: StrictMode,
    options?: { rules?: readonly unknown[] },
  ) => object
}
