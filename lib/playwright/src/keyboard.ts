import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Press any key on the currently focused element.
 * Prefer this over individual named wrappers — Playwright's key names are already readable.
 * Use the navigation variants below when you also need to assert where focus lands.
 */
export async function press(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key)
}

/**
 * Tab N times without asserting intermediate focus.
 * Use when you need to skip over several elements to reach a target.
 */
export async function tabTimes(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab')
  }
}

/**
 * Tab to the next focusable element and assert the target receives focus.
 * Playwright's toBeFocused() retries automatically — safe against framework update delays.
 */
export async function tabTo(page: Page, target: Locator): Promise<void> {
  await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

export async function shiftTabTo(page: Page, target: Locator): Promise<void> {
  await page.keyboard.press('Shift+Tab')
  await expect(target).toBeFocused()
}

// Internal: press a key and assert that DOM focus moves to target.
// Suitable for roving-tabindex widgets only — see arrowDownTo et al.
async function navigateTo(page: Page, key: string, target: Locator): Promise<void> {
  await page.keyboard.press(key)
  await expect(target).toBeFocused()
}

/**
 * Navigation helpers for composite widgets that use roving tabindex.
 * Each helper presses the key and asserts that DOM focus lands on target.
 *
 * NOT suitable for aria-activedescendant widgets (e.g. a listbox where focus stays on the
 * container and only aria-activedescendant changes). For those, use:
 *
 *   await press(page, 'ArrowDown')
 *   await expect(container).toHaveAttribute('aria-activedescendant', expectedId)
 */
export const arrowDownTo = (page: Page, target: Locator) => navigateTo(page, 'ArrowDown', target)
export const arrowUpTo = (page: Page, target: Locator) => navigateTo(page, 'ArrowUp', target)
export const arrowRightTo = (page: Page, target: Locator) => navigateTo(page, 'ArrowRight', target)
export const arrowLeftTo = (page: Page, target: Locator) => navigateTo(page, 'ArrowLeft', target)
export const homeTo = (page: Page, target: Locator) => navigateTo(page, 'Home', target)
export const endTo = (page: Page, target: Locator) => navigateTo(page, 'End', target)

/**
 * Focus a locator via click and assert it is focused.
 * Use when testing mouse-driven focus behavior. For keyboard-driven tests,
 * prefer locator.focus() directly — a click may trigger activation rather than
 * merely establishing focus.
 */
export async function clickAndFocus(locator: Locator): Promise<void> {
  await locator.click()
  await expect(locator).toBeFocused()
}

export async function expectFocused(locator: Locator): Promise<void> {
  await expect(locator).toBeFocused()
}

export async function expectNotFocused(locator: Locator): Promise<void> {
  await expect(locator).not.toBeFocused()
}
