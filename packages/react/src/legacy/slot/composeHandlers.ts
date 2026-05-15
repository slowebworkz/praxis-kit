export function composeHandlers<E = unknown>(
  childHandler: ((e: E) => void) | undefined | null,
  slotHandler: ((e: E) => void) | undefined | null,
): (e: E) => void {
  return (e: E) => {
    childHandler?.(e)
    slotHandler?.(e)
  }
}
