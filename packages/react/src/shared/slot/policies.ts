/**
 * Discriminant for the four merge strategies applied when both slot and child supply the same prop.
 *
 * Three distinct semantics are in play — do not conflate them:
 *
 * Execution order (side-effect sequencing):
 *   'chain'        — child handler fires first; slot handler fires second unless the event's
 *                    defaultPrevented flag is set by the time the child returns.
 *
 * Concatenation order (output string position, not override):
 *   'concat'       — slot classes precede child classes ("slot child"), preserving slot as the base.
 *
 * Override precedence (key-conflict resolution):
 *   'shallow-merge' — slot and child style objects are spread; child wins on key conflicts.
 *   'child-wins'   — child value replaces slot value outright.
 */
import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { isPlainObject } from './predicates'
import type { EventHandler, MergePolicyHandler } from './types'

export const PROP_MERGE_POLICIES = ['chain', 'concat', 'shallow-merge', 'child-wins'] as const
export type PropMergePolicy = (typeof PROP_MERGE_POLICIES)[number]

export type { MergePolicyHandler }

export function chainHandlers(childHandler: EventHandler, slotHandler: EventHandler): EventHandler {
  return (...args) => {
    childHandler(...args)
    const event = args[0]
    if (
      !(
        typeof event === 'object' &&
        event !== null &&
        'defaultPrevented' in event &&
        event.defaultPrevented
      )
    ) {
      slotHandler(...args)
    }
  }
}

export function mergeClassNames(slot: unknown, child: unknown): string {
  return clsx(slot as ClassValue, child as ClassValue)
}

export function mergeStyles(slot: unknown, child: unknown): unknown {
  if (!isPlainObject(slot) || !isPlainObject(child)) return child
  return { ...slot, ...child }
}

export const policyHandlers: Record<PropMergePolicy, MergePolicyHandler> = {
  chain: (slotVal, childVal) => chainHandlers(childVal as EventHandler, slotVal as EventHandler),
  concat: (slotVal, childVal) => mergeClassNames(slotVal, childVal),
  'shallow-merge': (slotVal, childVal) => mergeStyles(slotVal, childVal),
  'child-wins': (_slotVal, childVal) => childVal,
}
