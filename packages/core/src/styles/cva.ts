import { cva as cvaBase } from 'class-variance-authority'
import type { CVAConfig, VariantMap } from '../types'
import { cn } from '../utils'

/**
 * Thin wrapper over `class-variance-authority` that normalises the output through `cn` (clsx).
 *
 * `as never` on both the config and props arguments bridges the gap between CVA's internal
 * overloaded types and the generic `V extends VariantMap` shape used here — CVA's overloads
 * don't accept a generic-bound config directly. `resolveFactoryOptions` has already validated
 * the shape, so the cast is safe.
 */
export function cva<V extends VariantMap>(
  base: string,
  config?: CVAConfig<V>,
): (props?: Record<string, unknown>) => string {
  const fn = cvaBase(base, config as never)
  return (props) => cn(fn(props as never))
}
