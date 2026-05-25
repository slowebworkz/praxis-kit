/**
 * Claim: a component with variants retains the class pipeline (CVA) but no
 * AriaPolicyEngine or ChildrenEvaluator. Comparing with react-minimal shows
 * the cost of the variant/class subsystem in isolation.
 */
import { createPolymorphicComponent } from '@polymorphic-ui/react'

const variants = {
  intent: {
    primary: 'bg-blue-600 text-white',
    secondary: 'bg-gray-100 text-gray-800',
    ghost: 'bg-transparent text-blue-600',
  },
  size: {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg',
  },
} as const

export const Button = createPolymorphicComponent<'button', Record<string, never>, typeof variants>({
  tag: 'button',
  name: 'Button',
  styling: {
    base: 'inline-flex items-center justify-center rounded font-medium transition-colors',
    variants,
    defaults: { intent: 'primary', size: 'md' },
    compounds: [{ variants: { intent: 'primary', size: 'lg' }, class: 'shadow-md' }],
    presets: {
      cta: { intent: 'primary', size: 'lg' },
    },
  },
})
