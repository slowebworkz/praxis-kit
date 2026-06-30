import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from '@praxis-kit/lit'

type ButtonProps = { loading?: boolean; type?: string }

const variants = {
  intent: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
  },
  size: {
    sm: 'px-2 py-1 text-sm gap-1',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-3',
  },
} as const

export const Button = createContractComponent<'button', ButtonProps, typeof variants>({
  tag: 'button',
  name: 'Button',
  defaults: { type: 'button' },
  styling: {
    base: 'inline-flex items-center justify-center rounded font-medium transition-colors',
    variants,
    defaults: { intent: 'secondary', size: 'md' },
    presets: {
      cta: { intent: 'primary', size: 'lg' },
      subtle: { intent: 'ghost', size: 'sm' },
    },
  },
  filterProps: (key, variantKeys) => variantKeys.has(key) || key === 'loading',
  enforcement: { diagnostics: warnDiagnostics },
})
