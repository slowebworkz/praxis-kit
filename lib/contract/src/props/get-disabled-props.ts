// syncs disabled state across native attr, ARIA, and CSS-hook data attr
export function getDisabledProps(disabled?: boolean) {
  return {
    disabled,
    'aria-disabled': disabled ? 'true' : undefined,
    'data-disabled': disabled ? '' : undefined,
  } as const
}
