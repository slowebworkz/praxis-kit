import type { PropNormalizer } from '@praxis-kit/primitive'

export const invalidProps: PropNormalizer = ({
  invalid,
  'aria-invalid': ariaInvalid,
  'data-invalid': dataInvalid,
}) => {
  if (!invalid) return {}

  return {
    ...(ariaInvalid === undefined && { 'aria-invalid': 'true' }),
    ...(dataInvalid === undefined && { 'data-invalid': '' }),
  }
}
