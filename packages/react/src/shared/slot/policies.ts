/**
 * Names the four merge strategies that can apply to a prop when the slot and child both supply it.
 * Used as a discriminant to select the correct policy implementation in mergeProps.
 *
 * 'chain'        — event handlers: child fires first, then slot
 * 'concat'       — className: space-joined, slot first
 * 'merge-object' — style: spread, child wins on conflicts
 * 'child-wins'   — all other props: child value replaces slot value
 */
export type PropMergePolicy = 'chain' | 'concat' | 'merge-object' | 'child-wins'

export function chainHandlers(
  childHandler: (...args: unknown[]) => void,
  slotHandler: (...args: unknown[]) => void,
): (...args: unknown[]) => void {
  // Child fires first; slot fires after (unless the child called event.preventDefault).
  return (...args) => {
    childHandler(...args)
    slotHandler(...args)
  }
}

export function mergeClassNames(slot: unknown, child: unknown): string {
  return [slot, child].filter(Boolean).join(' ')
}

export function mergeStyles(slot: unknown, child: unknown): Record<string, unknown> {
  return { ...(slot as Record<string, unknown>), ...(child as Record<string, unknown>) }
}
