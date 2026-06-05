import type { ConsoleMessage as PWConsoleMessage, Page } from '@playwright/test'

// Playwright uses 'warn' (matching browser console API), not 'warning'.
const WARN_TYPES = new Set(['warn', 'warning'])

const CONTRACT_WARNING_PATTERN = /\b(praxis-ui|children-evaluator|aria-policy-engine)\b/i

export type ConsoleMessage = { type: string; text: string }

// Avoids mutable lastIndex on global regexes — test helpers can be reused across many messages.
function textMatches(text: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') return text.includes(pattern)
  return new RegExp(pattern.source, pattern.flags.replace('g', '')).test(text)
}

/**
 * Collect all console messages emitted during an async action and clean up automatically.
 * Prefer this over a manual on/off pair — cleanup runs in finally, so it cannot be skipped
 * even if an assertion inside the action throws.
 */
export async function collectConsoleDuring<T>(
  page: Page,
  action: () => Promise<T>,
): Promise<{ result: T; messages: ConsoleMessage[] }> {
  const messages: ConsoleMessage[] = []
  const handler = (msg: PWConsoleMessage) => messages.push({ type: msg.type(), text: msg.text() })
  page.on('console', handler)
  try {
    const result = await action()
    return { result, messages }
  } finally {
    page.off('console', handler)
  }
}

/**
 * Assert that at least one console message matches type + text.
 */
export function expectConsoleMessage(
  messages: ConsoleMessage[],
  options: { type?: string; text: string | RegExp },
): void {
  const candidates = options.type ? messages.filter((m) => m.type === options.type) : messages
  const matched = candidates.some((m) => textMatches(m.text, options.text))
  if (!matched) {
    const all = messages.map((m) => `  [${m.type}] ${m.text}`).join('\n') || '  (none)'
    throw new Error(
      `expectConsoleMessage: no message matched type=${options.type ?? 'any'} text=${String(options.text)}.\nAll messages:\n${all}`,
    )
  }
}

/**
 * Assert that no console message matches type + text.
 */
export function expectNoConsoleMessages(
  messages: ConsoleMessage[],
  options: { type?: string; text: string | RegExp },
): void {
  const candidates = options.type ? messages.filter((m) => m.type === options.type) : messages
  const matched = candidates.filter((m) => textMatches(m.text, options.text))
  if (matched.length > 0) {
    const texts = matched.map((m) => `  [${m.type}] ${m.text}`).join('\n')
    throw new Error(
      `expectNoConsoleMessages: unexpected message(s) matched type=${options.type ?? 'any'} text=${String(options.text)}:\n${texts}`,
    )
  }
}

/**
 * Assert that at least one warning matches a pattern.
 * Use after rendering a mis-populated slot tree to confirm cardinality enforcement fires.
 */
export function expectCardinalityWarning(
  messages: ConsoleMessage[],
  pattern: string | RegExp,
): void {
  const warnings = messages.filter((m) => WARN_TYPES.has(m.type))
  const matched = warnings.some((m) => textMatches(m.text, pattern))
  if (!matched) {
    const all = messages.map((m) => `  [${m.type}] ${m.text}`).join('\n') || '  (none)'
    throw new Error(
      `expectCardinalityWarning: no warning matched ${String(pattern)}.\nAll messages:\n${all}`,
    )
  }
}

/**
 * Assert that no praxis-ui contract warnings were emitted.
 */
export function expectNoContractWarnings(messages: ConsoleMessage[]): void {
  const praxisWarnings = messages.filter(
    (m) => WARN_TYPES.has(m.type) && CONTRACT_WARNING_PATTERN.test(m.text),
  )
  if (praxisWarnings.length > 0) {
    const texts = praxisWarnings.map((m) => `  [${m.type}] ${m.text}`).join('\n')
    throw new Error(`expectNoContractWarnings: unexpected praxis-ui warnings:\n${texts}`)
  }
}
