import { EVENT_HANDLER_RE } from './constants'

export function isEventKey(key: string): boolean {
  return EVENT_HANDLER_RE.test(key)
}
