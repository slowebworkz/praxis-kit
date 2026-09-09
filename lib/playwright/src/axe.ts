import type { Page, Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>

export type AxeSweepOptions = {
  /** Axe rules to disable. Use sparingly — document the reason at the call site. */
  disable?: string[]
  /** Limit sweep to a specific CSS selector. Prefer sweepAxeLocator() for element-scoped sweeps. */
  include?: string
  /** Exclude a CSS selector from the sweep — useful for third-party widgets or cookie banners. */
  exclude?: string
}

/**
 * Run axe-core against the page and return the raw results.
 * Use expectNoAxeViolations() to assert, or inspect results directly for custom reporting.
 */
export async function runAxe(page: Page, options: AxeSweepOptions = {}): Promise<AxeResults> {
  let builder = new AxeBuilder({ page })
  if (options.disable && options.disable.length > 0) builder = builder.disableRules(options.disable)
  if (options.include) builder = builder.include(options.include)
  if (options.exclude) builder = builder.exclude(options.exclude)
  return builder.analyze()
}

/**
 * Assert that an axe results object has no violations.
 * Reports each violation with its affected node targets for easier debugging.
 */
export function expectNoAxeViolations(results: AxeResults): void {
  if (results.violations.length === 0) return
  type V = AxeResults['violations'][number]
  const summary = results.violations
    .map((v: V) => {
      const nodes = v.nodes.map((n: V['nodes'][number]) => `    ${n.target.join(' ')}`).join('\n')
      return `[${v.id}] ${v.help}\n${nodes}`
    })
    .join('\n\n')
  throw new Error(`axe violations:\n\n${summary}`)
}

/**
 * Run an axe sweep against the full page and assert no violations.
 * Convenience wrapper for the common case.
 */
export async function sweepAxe(page: Page, options: AxeSweepOptions = {}): Promise<void> {
  const results = await runAxe(page, options)
  expectNoAxeViolations(results)
}

/**
 * Run an axe sweep scoped to a specific Locator.
 * Uses a temporary marker attribute to guarantee the selector targets exactly this element —
 * class and tag selectors are ambiguous when multiple elements share them.
 */
export async function sweepAxeLocator(page: Page, locator: Locator): Promise<void> {
  const attr = 'data-axe-scope'
  await locator.evaluate((el, a) => el.setAttribute(a, ''), attr)
  try {
    await sweepAxe(page, { include: `[${attr}]` })
  } finally {
    await locator.evaluate((el, a) => el.removeAttribute(a), attr)
  }
}
