import type { PropNormalizer } from '@praxis-kit/primitive'

export const disabledProps: PropNormalizer = ({
  disabled,
  'aria-disabled': ariaDisabled,
  'data-disabled': dataDisabled,
}) => {
  if (!disabled) return {}

  return {
    ...(ariaDisabled === undefined && { 'aria-disabled': 'true' }),
    ...(dataDisabled === undefined && { 'data-disabled': '' }),
  }
}
