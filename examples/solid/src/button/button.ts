import { createContractComponent } from '@praxis-kit/solid'

type ButtonProps = { loading?: boolean }

type ButtonVariants = {
  intent: { primary: string; secondary: string; ghost: string }
  size: { sm: string; md: string; lg: string }
}

export const Button = createContractComponent<'button', ButtonProps, ButtonVariants>({
  tag: 'button',
  name: 'Button',
  styling: {
    base: 'inline-flex items-center justify-center rounded font-medium transition-colors',
    variants: {
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
    },
    defaults: { intent: 'secondary', size: 'md' },
    presets: {
      cta: { intent: 'primary', size: 'lg' },
      subtle: { intent: 'ghost', size: 'sm' },
    },
  },
  filterProps: (key: string, variantKeys: ReadonlySet<string>) =>
    variantKeys.has(key) || key === 'loading',
})
