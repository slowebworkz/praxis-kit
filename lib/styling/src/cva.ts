import { cva as cvaBase } from 'class-variance-authority'
import type { CVAConfig, VariantMap } from './types'
import { cn } from './utils'

export function cva<V extends VariantMap>(
  base: string,
  config?: CVAConfig<V>,
): (props?: Record<string, unknown>) => string {
  const fn = cvaBase(base, config as never)
  return (props) => cn(fn(props as never))
}
