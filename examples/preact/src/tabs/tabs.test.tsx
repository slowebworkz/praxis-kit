import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/preact'
import { h } from 'preact'
import { Tabs } from './index'

afterEach(cleanup)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = (c: unknown): any => c

function makeTabs(defaultValue = 'a') {
  return render(
    h(
      C(Tabs.Root),
      { defaultValue },
      h(
        C(Tabs.List),
        null,
        h(C(Tabs.Trigger), { value: 'a' }, 'Tab A'),
        h(C(Tabs.Trigger), { value: 'b' }, 'Tab B'),
      ),
      h(C(Tabs.Content), { value: 'a' }, 'Panel A'),
      h(C(Tabs.Content), { value: 'b' }, 'Panel B'),
    ),
  )
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Tabs — rendering', () => {
  it('renders without throwing', () => {
    expect(() => makeTabs()).not.toThrow()
  })

  it('renders a tablist', () => {
    const { container } = makeTabs()
    expect(container.querySelector('[role="tablist"]')).toBeTruthy()
  })

  it('renders two tab triggers', () => {
    const { container } = makeTabs()
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(2)
  })

  it('renders the active panel', () => {
    const { container } = makeTabs('a')
    const panel = container.querySelector('[role="tabpanel"]')
    expect(panel).toBeTruthy()
    expect(panel!.textContent).toBe('Panel A')
  })

  it('does not render inactive panels', () => {
    const { container } = makeTabs('a')
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1)
  })
})

// ── ARIA wiring ───────────────────────────────────────────────────────────────

describe('Tabs — ARIA wiring', () => {
  it('marks the active trigger as selected', () => {
    const { container } = makeTabs('a')
    const [triggerA] = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggerA!.getAttribute('aria-selected')).toBe('true')
  })

  it('marks the inactive trigger as not selected', () => {
    const { container } = makeTabs('a')
    const triggers = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggers[1]!.getAttribute('aria-selected')).toBe('false')
  })

  it('wires aria-controls to panel id', () => {
    const { container } = makeTabs('a')
    const [triggerA] = Array.from(container.querySelectorAll('[role="tab"]'))
    const controls = triggerA!.getAttribute('aria-controls')!
    expect(container.querySelector(`#${controls}`)).toBeTruthy()
  })

  it('wires aria-labelledby to trigger id', () => {
    const { container } = makeTabs('a')
    const panel = container.querySelector('[role="tabpanel"]')!
    const labelledBy = panel.getAttribute('aria-labelledby')!
    expect(container.querySelector(`#${labelledBy}`)).toBeTruthy()
  })

  it('sets data-state=active on the active trigger', () => {
    const { container } = makeTabs('a')
    const [triggerA] = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggerA!.getAttribute('data-state')).toBe('active')
  })

  it('sets data-state=inactive on inactive triggers', () => {
    const { container } = makeTabs('a')
    const triggers = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggers[1]!.getAttribute('data-state')).toBe('inactive')
  })
})

// ── Tab switching ─────────────────────────────────────────────────────────────

describe('Tabs — switching', () => {
  it('shows the correct panel on click', () => {
    const { container } = makeTabs('a')
    const triggers = Array.from(container.querySelectorAll('[role="tab"]'))
    fireEvent.click(triggers[1]!)
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe('Panel B')
  })

  it('updates aria-selected after switching', () => {
    const { container } = makeTabs('a')
    const triggers = Array.from(container.querySelectorAll('[role="tab"]'))
    fireEvent.click(triggers[1]!)
    const updated = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(updated[0]!.getAttribute('aria-selected')).toBe('false')
    expect(updated[1]!.getAttribute('aria-selected')).toBe('true')
  })
})

// ── Controlled mode ───────────────────────────────────────────────────────────

describe('Tabs — controlled mode', () => {
  it('respects a controlled value', () => {
    const { container } = render(
      h(
        C(Tabs.Root),
        { value: 'b' },
        h(
          C(Tabs.List),
          null,
          h(C(Tabs.Trigger), { value: 'a' }, 'Tab A'),
          h(C(Tabs.Trigger), { value: 'b' }, 'Tab B'),
        ),
        h(C(Tabs.Content), { value: 'a' }, 'Panel A'),
        h(C(Tabs.Content), { value: 'b' }, 'Panel B'),
      ),
    )
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe('Panel B')
  })

  it('calls onValueChange on click', () => {
    let captured: string | undefined
    const { container } = render(
      h(
        C(Tabs.Root),
        {
          value: 'a',
          onValueChange: (v: string) => {
            captured = v
          },
        },
        h(
          C(Tabs.List),
          null,
          h(C(Tabs.Trigger), { value: 'a' }, 'Tab A'),
          h(C(Tabs.Trigger), { value: 'b' }, 'Tab B'),
        ),
        h(C(Tabs.Content), { value: 'a' }, 'Panel A'),
        h(C(Tabs.Content), { value: 'b' }, 'Panel B'),
      ),
    )
    fireEvent.click(Array.from(container.querySelectorAll('[role="tab"]'))[1]!)
    expect(captured).toBe('b')
  })
})

// ── Indicator ─────────────────────────────────────────────────────────────────

describe('Tabs — Indicator', () => {
  it('renders with data-active-value', () => {
    const { container } = render(
      h(
        C(Tabs.Root),
        { defaultValue: 'a' },
        h(
          C(Tabs.List),
          null,
          h(C(Tabs.Trigger), { value: 'a' }, 'Tab A'),
          h(C(Tabs.Indicator), null),
        ),
        h(C(Tabs.Content), { value: 'a' }, 'Panel A'),
      ),
    )
    expect(container.querySelector('[aria-hidden]')!.getAttribute('data-active-value')).toBe('a')
  })
})

// ── Context guard ─────────────────────────────────────────────────────────────

describe('Tabs — context guard', () => {
  it('throws when Trigger is rendered outside Tabs.Root', () => {
    expect(() => render(h(C(Tabs.Trigger), { value: 'x' }, 'Orphan'))).toThrow(
      'Tabs.* components must be rendered inside <Tabs.Root>.',
    )
  })
})
