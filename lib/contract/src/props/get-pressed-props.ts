import type { PropNormalizer } from '@praxis-kit/shared/types'

export const pressedProps: PropNormalizer = ({
  pressed,
  'aria-pressed': ariaPressed,
  'data-pressed': dataPressed,
}) => {
  if (!pressed) return {}

  return {
    ...(ariaPressed === undefined && {
      'aria-pressed': 'true',
    }),
    ...(dataPressed === undefined && {
      'data-pressed': '',
    }),
  }
}
