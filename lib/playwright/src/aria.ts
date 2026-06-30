import type { Locator } from '@playwright/test'
import { expect } from '@playwright/test'

// Inline the role union from Playwright's toHaveRole signature — AriaRole is not a named export.
type AriaRole = Parameters<ReturnType<typeof expect<Locator>>['toHaveRole']>[0]

export type { AriaRole }

export async function expectRole(locator: Locator, role: AriaRole): Promise<void> {
  await expect(locator).toHaveRole(role)
}

/**
 * Assert that a locator has an accessible name.
 * Uses Playwright's accessibility engine — covers aria-label, aria-labelledby,
 * label[for], title, and text content, not just attribute presence.
 */
export async function expectNamed(locator: Locator, name?: string | RegExp): Promise<void> {
  await expect(locator).toHaveAccessibleName(name ?? /.+/)
}

export async function expectAriaSnapshot(locator: Locator, snapshot: string): Promise<void> {
  await expect(locator).toMatchAriaSnapshot(snapshot)
}

const LIVE_REGION_ROLES = new Set(['alert', 'status', 'log', 'timer'])

/**
 * Assert that a live region's text changes after an action.
 *
 * Verifies three things:
 *   1. The element is marked as a live region (aria-live or a live-region role) — a div
 *      that updates visually but is missing this markup won't be announced by AT.
 *   2. The text reaches the expected value after the action.
 *   3. The content actually changed — a region that already held expectedText before the
 *      action fired is not a live update.
 *
 * Note: if the region cycles through states (e.g. "Loading…" → "Saved" → "Loading…") and
 * settles back to the original text before this helper reads `after`, the change-check
 * will produce a false failure. For highly dynamic UIs a MutationObserver injected via
 * page.evaluate() is the correct solution; this implementation is sufficient for
 * typical toast/status-message scenarios.
 */
export async function expectLiveRegionUpdate(
  regionLocator: Locator,
  action: () => Promise<void>,
  expectedText: string,
): Promise<void> {
  const ariaLive = await regionLocator.getAttribute('aria-live')
  const role = await regionLocator.getAttribute('role')
  if (!ariaLive && (!role || !LIVE_REGION_ROLES.has(role))) {
    throw new Error(
      `expectLiveRegionUpdate: element is not a live region. ` +
        `Add aria-live or role="alert|status|log|timer".`,
    )
  }

  const before = await regionLocator.textContent()
  await action()
  await expect(regionLocator).toHaveText(expectedText)
  const after = await regionLocator.textContent()
  if (before === after) {
    throw new Error(`Live region content never changed. Before: "${before}", After: "${after}"`)
  }
}
