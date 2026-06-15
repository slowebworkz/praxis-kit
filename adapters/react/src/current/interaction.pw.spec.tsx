import { test, expect } from '@playwright/experimental-ct-react'
import { clickAndFocus, press, tabTo, expectFocused, sweepAxeLocator } from '@praxis-kit/playwright'
import { Button, AlertRegion } from './interaction.pw.fixtures'

// ---------------------------------------------------------------------------
// Tag polymorphism — rendered tag in real DOM
// ---------------------------------------------------------------------------

test.describe('tag polymorphism', () => {
  test('renders default tag in real DOM', async ({ mount }) => {
    const component = await mount(<Button>Click me</Button>)
    const tag = await component.evaluate((el) => el.tagName.toLowerCase())
    expect(tag).toBe('button')
  })

  test('renders as="a" in real DOM', async ({ mount }) => {
    const component = await mount(
      <Button as="a" href="#">
        Link button
      </Button>,
    )
    const tag = await component.evaluate((el) => el.tagName.toLowerCase())
    expect(tag).toBe('a')
  })
})

// ---------------------------------------------------------------------------
// Keyboard activation
// ---------------------------------------------------------------------------

test.describe('button keyboard activation', () => {
  test('receives focus on click', async ({ mount }) => {
    const component = await mount(<Button>Click me</Button>)
    await clickAndFocus(component)
    await expectFocused(component)
  })

  test('receives focus via Tab', async ({ mount, page }) => {
    await mount(
      <div>
        <button>First</button>
        <Button id="target">Target</Button>
      </div>,
    )
    await page.locator('button:first-child').focus()
    await tabTo(page, page.locator('#target'))
  })

  test('Enter key fires click handler', async ({ mount, page }) => {
    const component = await mount(<Button data-click-count="0">Press Enter</Button>)
    await component.evaluate((el) =>
      el.addEventListener('click', () => {
        el.setAttribute('data-click-count', String(Number(el.getAttribute('data-click-count')) + 1))
      }),
    )
    await component.focus()
    await press(page, 'Enter')
    await expect(component).toHaveAttribute('data-click-count', '1')
  })

  test('Space key fires click handler', async ({ mount, page }) => {
    const component = await mount(<Button data-click-count="0">Press Space</Button>)
    await component.evaluate((el) =>
      el.addEventListener('click', () => {
        el.setAttribute('data-click-count', String(Number(el.getAttribute('data-click-count')) + 1))
      }),
    )
    await component.focus()
    await press(page, 'Space')
    await expect(component).toHaveAttribute('data-click-count', '1')
  })

  test('disabled button is not focusable', async ({ mount }) => {
    const component = await mount(<Button disabled>Disabled</Button>)
    const isDisabled = await component.evaluate((el) => (el as HTMLButtonElement).disabled)
    expect(isDisabled).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// ARIA live region enforcement — verifies AriaPolicyEngine output in real DOM
// ---------------------------------------------------------------------------

test.describe('aria-live region enforcement', () => {
  test('div with role="alert" receives injected aria-live="assertive"', async ({ mount }) => {
    const component = await mount(<AlertRegion role="alert">Alert!</AlertRegion>)
    await expect(component).toHaveAttribute('aria-live', 'assertive')
  })

  test('div with role="status" receives injected aria-live="polite"', async ({ mount }) => {
    const component = await mount(<AlertRegion role="status">Status update</AlertRegion>)
    await expect(component).toHaveAttribute('aria-live', 'polite')
  })
})

// ---------------------------------------------------------------------------
// Axe sweep
// ---------------------------------------------------------------------------

test.describe('axe WCAG sweep', () => {
  test('button with visible text label passes axe', async ({ mount, page }) => {
    const component = await mount(<Button>Save changes</Button>)
    await sweepAxeLocator(page, component)
  })

  test('button with aria-label passes axe', async ({ mount, page }) => {
    const component = await mount(<Button aria-label="Submit form">Submit</Button>)
    await sweepAxeLocator(page, component)
  })
})
