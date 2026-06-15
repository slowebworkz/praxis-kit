// syncs invalid state across ARIA and CSS-hook data attr
interface InvalidProps {
  invalid?: boolean
  'aria-invalid'?: boolean | 'true' | 'false'
  'data-invalid'?: string
}

export function getInvalidProps({
  invalid,
  'aria-invalid': ariaInvalid,
  'data-invalid': dataInvalid,
}: InvalidProps) {
  return {
    'aria-invalid': ariaInvalid ?? (invalid ? 'true' : undefined),
    'data-invalid': dataInvalid ?? (invalid ? '' : undefined),
  } as const
}
