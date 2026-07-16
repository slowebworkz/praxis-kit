export type AriaValueType =
  | { kind: 'boolean' }
  | { kind: 'tristate' }
  | { kind: 'number' }
  | { kind: 'integer'; min?: number; max?: number }
  | { kind: 'enum'; values: ReadonlySet<string> }
