// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, act } from '@testing-library/svelte'
import TabsFixture from './TabsFixture.svelte'
import TabsTrigger from './TabsTrigger.svelte'

afterEach(cleanup)

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Tabs — rendering', () => {
  it('renders without throwing', () => {
    expect(() => render(TabsFixture)).not.toThrow()
  })

  it('renders a tablist', () => {
    const { container } = render(TabsFixture)
    expect(container.querySelector('[role="tablist"]')).toBeTruthy()
  })

  it('renders two tab triggers', () => {
    const { container } = render(TabsFixture)
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(2)
  })

  it('renders the active panel', () => {
    const { container } = render(TabsFixture, { props: { defaultValue: 'a' } })
    const panel = container.querySelector('[role="tabpanel"]')
    expect(panel).toBeTruthy()
    expect(panel!.textContent).toBe('Panel A')
  })

  it('does not render inactive panels', () => {
    const { container } = render(TabsFixture, { props: { defaultValue: 'a' } })
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1)
  })
})

// ── ARIA wiring ───────────────────────────────────────────────────────────────

describe('Tabs — ARIA wiring', () => {
  it('marks the active trigger as selected', () => {
    const { container } = render(TabsFixture, { props: { defaultValue: 'a' } })
    const [triggerA] = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggerA!.getAttribute('aria-selected')).toBe('true')
  })

  it('marks the inactive trigger as not selected', () => {
    const { container } = render(TabsFixture, { props: { defaultValue: 'a' } })
    const triggers = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggers[1]!.getAttribute('aria-selected')).toBe('false')
  })

  it('wires aria-controls to panel id', () => {
    const { container } = render(TabsFixture, { props: { defaultValue: 'a' } })
    const [triggerA] = Array.from(container.querySelectorAll('[role="tab"]'))
    const controls = triggerA!.getAttribute('aria-controls')!
    expect(container.querySelector(`#${controls}`)).toBeTruthy()
  })

  it('wires aria-labelledby to trigger id', () => {
    const { container } = render(TabsFixture, { props: { defaultValue: 'a' } })
    const panel = container.querySelector('[role="tabpanel"]')!
    const labelledBy = panel.getAttribute('aria-labelledby')!
    expect(container.querySelector(`#${labelledBy}`)).toBeTruthy()
  })

  it('sets data-state=active on the active trigger', () => {
    const { container } = render(TabsFixture, { props: { defaultValue: 'a' } })
    const [triggerA] = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggerA!.getAttribute('data-state')).toBe('active')
  })

  it('sets data-state=inactive on inactive triggers', () => {
    const { container } = render(TabsFixture, { props: { defaultValue: 'a' } })
    const triggers = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggers[1]!.getAttribute('data-state')).toBe('inactive')
  })
})

// ── Tab switching ─────────────────────────────────────────────────────────────

describe('Tabs — switching', () => {
  it('shows the correct panel on click', async () => {
    const { container } = render(TabsFixture, { props: { defaultValue: 'a' } })
    await act(() => fireEvent.click(Array.from(container.querySelectorAll('[role="tab"]'))[1]!))
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe('Panel B')
  })

  it('updates aria-selected after switching', async () => {
    const { container } = render(TabsFixture, { props: { defaultValue: 'a' } })
    await act(() => fireEvent.click(Array.from(container.querySelectorAll('[role="tab"]'))[1]!))
    const updated = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(updated[0]!.getAttribute('aria-selected')).toBe('false')
    expect(updated[1]!.getAttribute('aria-selected')).toBe('true')
  })
})

// ── Controlled mode ───────────────────────────────────────────────────────────

describe('Tabs — controlled mode', () => {
  it('respects a controlled value', () => {
    const { container } = render(TabsFixture, { props: { value: 'b' } })
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe('Panel B')
  })

  it('calls onValueChange on click', async () => {
    let captured: string | undefined
    const { container } = render(TabsFixture, {
      props: {
        value: 'a',
        onValueChange: (v: string) => {
          captured = v
        },
      },
    })
    await act(() => fireEvent.click(Array.from(container.querySelectorAll('[role="tab"]'))[1]!))
    expect(captured).toBe('b')
  })
})

// ── Indicator ─────────────────────────────────────────────────────────────────

describe('Tabs — Indicator', () => {
  it('renders with data-active-value', () => {
    const { container } = render(TabsFixture, {
      props: { defaultValue: 'a', showIndicator: true },
    })
    expect(container.querySelector('[aria-hidden]')!.getAttribute('data-active-value')).toBe('a')
  })

  it('updates data-active-value after switching', async () => {
    const { container } = render(TabsFixture, {
      props: { defaultValue: 'a', showIndicator: true },
    })
    await act(() => fireEvent.click(Array.from(container.querySelectorAll('[role="tab"]'))[1]!))
    expect(container.querySelector('[aria-hidden]')!.getAttribute('data-active-value')).toBe('b')
  })
})

// ── Context guard ─────────────────────────────────────────────────────────────

describe('Tabs — context guard', () => {
  it('throws when Trigger is rendered outside TabsRoot', () => {
    expect(() => render(TabsTrigger, { props: { value: 'x' } })).toThrow(
      'Tabs.* components must be rendered inside <Tabs.Root>.',
    )
  })
})
