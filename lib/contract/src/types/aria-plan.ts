import type { AnyRecord, ValidationViolation } from '@praxis-ui/shared'

export type AriaPlan = {
  readonly removals: ReadonlySet<string>
  // "updates" covers both new keys (additions) and changed values (modifications) relative to input props.
  readonly updates: Readonly<AnyRecord>
  readonly violations: readonly ValidationViolation[]
}
