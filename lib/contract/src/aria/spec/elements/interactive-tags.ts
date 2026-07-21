// Natively interactive HTML elements — always keyboard-reachable unless explicitly disabled.
export const INTERACTIVE_TAGS: ReadonlySet<string> = new Set([
  'a',
  'button',
  'input',
  'select',
  'textarea',
])
