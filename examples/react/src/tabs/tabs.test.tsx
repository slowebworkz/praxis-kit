import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'

import { Tabs } from './index'

let container: HTMLElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  document.body.removeChild(container)
})

function mount(el: ReturnType<typeof createElement>) {
  act(() => {
    root.render(el)
  })
}

function makeTabs(defaultValue = 'a') {
  return createElement(
    Tabs.Root,
    { defaultValue },
    createElement(
      Tabs.List,
      null,
      createElement(Tabs.Trigger, { value: 'a' }, 'Tab A'),
      createElement(Tabs.Trigger, { value: 'b' }, 'Tab B'),
    ),
    createElement(Tabs.Content, { value: 'a' }, 'Panel A'),
    createElement(Tabs.Content, { value: 'b' }, 'Panel B'),
  )
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Tabs — rendering', () => {
  it('renders without throwing', () => {
    expect(() => mount(makeTabs())).not.toThrow()
  })

  it('renders a tablist', () => {
    mount(makeTabs())
    expect(container.querySelector('[role="tablist"]')).toBeTruthy()
  })

  it('renders tab triggers as buttons', () => {
    mount(makeTabs())
    const tabs = container.querySelectorAll('[role="tab"]')
    expect(tabs).toHaveLength(2)
  })

  it('renders the active panel', () => {
    mount(makeTabs('a'))
    expect(container.querySelector('[role="tabpanel"]')).toBeTruthy()
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe('Panel A')
  })

  it('does not render inactive panels', () => {
    mount(makeTabs('a'))
    const panels = container.querySelectorAll('[role="tabpanel"]')
    expect(panels).toHaveLength(1)
  })
})

// ── ARIA wiring ───────────────────────────────────────────────────────────────

describe('Tabs — ARIA wiring', () => {
  it('marks the active trigger as selected', () => {
    mount(makeTabs('a'))
    const [triggerA] = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggerA!.getAttribute('aria-selected')).toBe('true')
  })

  it('marks the inactive trigger as not selected', () => {
    mount(makeTabs('a'))
    const triggers = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggers[1]!.getAttribute('aria-selected')).toBe('false')
  })

  it('wires aria-controls on trigger to panel id', () => {
    mount(makeTabs('a'))
    const [triggerA] = Array.from(container.querySelectorAll('[role="tab"]'))
    const controls = triggerA!.getAttribute('aria-controls')!
    expect(container.querySelector(`#${controls}`)).toBeTruthy()
  })

  it('wires aria-labelledby on panel to trigger id', () => {
    mount(makeTabs('a'))
    const panel = container.querySelector('[role="tabpanel"]')!
    const labelledBy = panel.getAttribute('aria-labelledby')!
    expect(container.querySelector(`#${labelledBy}`)).toBeTruthy()
  })

  it('sets data-state=active on the active trigger', () => {
    mount(makeTabs('a'))
    const [triggerA] = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggerA!.getAttribute('data-state')).toBe('active')
  })

  it('sets data-state=inactive on inactive triggers', () => {
    mount(makeTabs('a'))
    const triggers = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(triggers[1]!.getAttribute('data-state')).toBe('inactive')
  })
})

// ── Tab switching ─────────────────────────────────────────────────────────────

describe('Tabs — switching', () => {
  it('shows the correct panel on click', () => {
    mount(makeTabs('a'))
    const triggers = container.querySelectorAll('[role="tab"]')
    act(() => {
      ;(triggers[1] as HTMLElement).click()
    })
    const panel = container.querySelector('[role="tabpanel"]')!
    expect(panel.textContent).toBe('Panel B')
  })

  it('updates aria-selected after switching', () => {
    mount(makeTabs('a'))
    const triggers = container.querySelectorAll('[role="tab"]')
    act(() => {
      ;(triggers[1] as HTMLElement).click()
    })
    const updated = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(updated[0]!.getAttribute('aria-selected')).toBe('false')
    expect(updated[1]!.getAttribute('aria-selected')).toBe('true')
  })
})

// ── Controlled mode ───────────────────────────────────────────────────────────

describe('Tabs — controlled mode', () => {
  it('respects an externally controlled value', () => {
    mount(
      createElement(
        Tabs.Root,
        { value: 'b' },
        createElement(
          Tabs.List,
          null,
          createElement(Tabs.Trigger, { value: 'a' }, 'Tab A'),
          createElement(Tabs.Trigger, { value: 'b' }, 'Tab B'),
        ),
        createElement(Tabs.Content, { value: 'a' }, 'Panel A'),
        createElement(Tabs.Content, { value: 'b' }, 'Panel B'),
      ),
    )
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe('Panel B')
  })

  it('calls onValueChange when a trigger is clicked', () => {
    let captured: string | undefined
    mount(
      createElement(
        Tabs.Root,
        {
          value: 'a',
          onValueChange: (v: string) => {
            captured = v
          },
        },
        createElement(
          Tabs.List,
          null,
          createElement(Tabs.Trigger, { value: 'a' }, 'Tab A'),
          createElement(Tabs.Trigger, { value: 'b' }, 'Tab B'),
        ),
        createElement(Tabs.Content, { value: 'a' }, 'Panel A'),
        createElement(Tabs.Content, { value: 'b' }, 'Panel B'),
      ),
    )
    const triggers = container.querySelectorAll('[role="tab"]')
    act(() => {
      ;(triggers[1] as HTMLElement).click()
    })
    expect(captured).toBe('b')
  })
})

// ── Indicator ─────────────────────────────────────────────────────────────────

describe('Tabs — Indicator', () => {
  it('renders the indicator with the active value as a data attribute', () => {
    mount(
      createElement(
        Tabs.Root,
        { defaultValue: 'a' },
        createElement(
          Tabs.List,
          null,
          createElement(Tabs.Trigger, { value: 'a' }, 'Tab A'),
          createElement(Tabs.Indicator, null),
        ),
        createElement(Tabs.Content, { value: 'a' }, 'Panel A'),
      ),
    )
    const indicator = container.querySelector('[aria-hidden]')!
    expect(indicator.getAttribute('data-active-value')).toBe('a')
  })

  it('updates data-active-value after switching', () => {
    mount(
      createElement(
        Tabs.Root,
        { defaultValue: 'a' },
        createElement(
          Tabs.List,
          null,
          createElement(Tabs.Trigger, { value: 'a' }, 'Tab A'),
          createElement(Tabs.Trigger, { value: 'b' }, 'Tab B'),
          createElement(Tabs.Indicator, null),
        ),
        createElement(Tabs.Content, { value: 'a' }, 'Panel A'),
        createElement(Tabs.Content, { value: 'b' }, 'Panel B'),
      ),
    )
    const triggers = container.querySelectorAll('[role="tab"]')
    act(() => {
      ;(triggers[1] as HTMLElement).click()
    })
    const indicator = container.querySelector('[aria-hidden]')!
    expect(indicator.getAttribute('data-active-value')).toBe('b')
  })
})

// ── Context guard ─────────────────────────────────────────────────────────────

describe('Tabs — context guard', () => {
  it('throws when Trigger is rendered outside Tabs.Root', () => {
    expect(() => mount(createElement(Tabs.Trigger, { value: 'x' }, 'Orphan'))).toThrow(
      'Tabs.* components must be rendered inside <Tabs.Root>.',
    )
  })
})
