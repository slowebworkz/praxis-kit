import { cva as cvaBase } from 'class-variance-authority'
import type { AnyRecord, CVAConfig, VariantMap } from './types'
import { cn } from '@praxis-kit/primitive'

export function cva<V extends VariantMap>(
  base: string,
  config?: CVAConfig<V>,
): (props?: AnyRecord) => string {
  const fn = cvaBase(base, config as never)
  return (props) => cn(fn(props as never))
}
