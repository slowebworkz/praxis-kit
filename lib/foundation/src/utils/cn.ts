import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'

// Re-exported so callers can type values headed for `cn` without importing `clsx` themselves.
export type { ClassValue }

export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs)
}
