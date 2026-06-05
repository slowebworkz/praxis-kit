import { test, expect } from '@playwright/experimental-ct-vue'
import { clickAndFocus, press, tabTo, expectFocused, sweepAxeLocator } from '@praxis-ui/playwright'
import Button from './interaction.pw.fixtures/Button.vue'
import AlertRegion from './interaction.pw.fixtures/AlertRegion.vue'

// ---------------------------------------------------------------------------
// Tag polymorphism — rendered tag in real DOM
// ---------------------------------------------------------------------------

test.describe('tag polymorphism', () => {
  test('renders default tag in real DOM', async ({ mount, page }) => {
    await mount(Button)
    const tag = await page.locator('#root > *').evaluate((el) => el.tagName.toLowerCase())
    expect(tag).toBe('button')
  })

  test('renders as="a" in real DOM', async ({ mount, page }) => {
    await mount(Button, { props: { as: 'a', href: '#' } })
    const tag = await page.locator('#root > *').evaluate((el) => el.tagName.toLowerCase())
    expect(tag).toBe('a')
  })
})

// ---------------------------------------------------------------------------
// Keyboard activation
// ---------------------------------------------------------------------------

test.describe('button keyboard activation', () => {
  test('receives focus on click', async ({ mount, page }) => {
    await mount(Button)
    const btn = page.locator('#root > button')
    await clickAndFocus(btn)
    await expectFocused(btn)
  })

  test('receives focus via Tab', async ({ mount, page }) => {
    await mount(Button, { props: { id: 'target' } })
    await page.locator('#root > button').evaluate((el) => {
      const prev = document.createElement('button')
      prev.textContent = 'First'
      el.parentElement?.insertBefore(prev, el)
    })
    await page.locator('button', { hasText: 'First' }).focus()
    await tabTo(page, page.locator('#target'))
  })

  test('Enter key fires click handler', async ({ mount, page }) => {
    const clicks = { count: 0 }
    await mount(Button, { props: { onClick: () => clicks.count++ } })
    const btn = page.locator('#root > button')
    await btn.focus()
    await press(page, 'Enter')
    expect(clicks.count).toBe(1)
  })

  test('Space key fires click handler', async ({ mount, page }) => {
    const clicks = { count: 0 }
    await mount(Button, { props: { onClick: () => clicks.count++ } })
    const btn = page.locator('#root > button')
    await btn.focus()
    await press(page, 'Space')
    expect(clicks.count).toBe(1)
  })

  test('disabled button is not focusable', async ({ mount, page }) => {
    await mount(Button, { props: { disabled: true } })
    const isDisabled = await page
      .locator('#root > button')
      .evaluate((el) => (el as HTMLButtonElement).disabled)
    expect(isDisabled).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Anchor keyboard activation — browser semantics differ from <button>
// ---------------------------------------------------------------------------

test.describe('anchor keyboard activation', () => {
  test('anchor activates on Enter', async ({ mount, page }) => {
    const clicks = { count: 0 }
    await mount(Button, { props: { as: 'a', href: '#', onClick: () => clicks.count++ } })
    const anchor = page.locator('#root > a')
    await anchor.focus()
    await press(page, 'Enter')
    expect(clicks.count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// ARIA live region enforcement — verifies AriaPolicyEngine output in real DOM
// ---------------------------------------------------------------------------

test.describe('aria-live region enforcement', () => {
  test('div with role="alert" receives injected aria-live="assertive"', async ({ mount, page }) => {
    await mount(AlertRegion, { props: { role: 'alert' } })
    await expect(page.locator('#root > [role="alert"]')).toHaveAttribute('aria-live', 'assertive')
  })

  test('div with role="status" receives injected aria-live="polite"', async ({ mount, page }) => {
    await mount(AlertRegion, { props: { role: 'status' } })
    await expect(page.locator('#root > [role="status"]')).toHaveAttribute('aria-live', 'polite')
  })
})

// ---------------------------------------------------------------------------
// Axe sweep — accessible name computation
// ---------------------------------------------------------------------------

test.describe('axe WCAG sweep', () => {
  test('button with visible text label passes axe', async ({ mount, page }) => {
    await mount(Button, { slots: { default: 'Save changes' } })
    await sweepAxeLocator(page, page.locator('#root > button'))
  })

  test('button with aria-label passes axe', async ({ mount, page }) => {
    await mount(Button, { props: { 'aria-label': 'Submit form' }, slots: { default: 'Submit' } })
    await sweepAxeLocator(page, page.locator('#root > button'))
  })

  test('button with aria-labelledby passes axe', async ({ mount, page }) => {
    await mount(Button, { props: { 'aria-labelledby': 'btn-label' }, slots: { default: 'Submit' } })
    // inject the referenced label element
    await page.locator('#root').evaluate((el) => {
      const label = document.createElement('span')
      label.id = 'btn-label'
      label.textContent = 'Confirm deletion'
      el.prepend(label)
    })
    await sweepAxeLocator(page, page.locator('#root > button'))
  })
})
