import type { StrictMode } from '../types'

// Batch buffer for async-warn mode. All messages queued in one synchronous
// pass are flushed in a single microtask rather than one microtask each.
const pendingAsyncWarns = new Set<string>()
let asyncWarnScheduled = false

function flushAsyncWarns(): void {
  asyncWarnScheduled = false
  const messages = [...pendingAsyncWarns]
  pendingAsyncWarns.clear()
  for (const msg of messages) {
    console.warn(msg)
  }
}

function scheduleAsyncWarn(message: string): void {
  if (pendingAsyncWarns.has(message)) return
  pendingAsyncWarns.add(message)
  if (!asyncWarnScheduled) {
    asyncWarnScheduled = true
    queueMicrotask(flushAsyncWarns)
  }
}

export abstract class StrictBase {
  protected readonly strict: StrictMode

  constructor(strict: StrictMode) {
    this.strict = strict
  }

  protected violate(message: string): void {
    if (this.strict === true || this.strict === 'throw') {
      throw new Error(message)
    }
    this.warn(message)
  }

  // Always caps at console.warn — never throws. ARIA 'warning' violations route here
  // so they surface even in strict='throw' mode without aborting a render.
  protected warn(message: string): void {
    if (!this.strict) return
    if (this.strict === 'async-warn') {
      scheduleAsyncWarn(message)
      return
    }
    console.warn(message)
  }

  protected invariant(condition: unknown, message: string): void {
    if (!condition) {
      this.violate(message)
    }
  }
}

/** Clears pending async-warn messages. Exposed for test isolation only. */
export function _resetAsyncWarns(): void {
  pendingAsyncWarns.clear()
  asyncWarnScheduled = false
}
