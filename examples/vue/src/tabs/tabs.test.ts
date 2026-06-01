import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { Tabs } from './index'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(comp: unknown): any {
  return comp
}

function queryAll(el: Element, selector: string): Element[] {
  return Array.from(el.querySelectorAll(selector))
}

function makeTabs(defaultValue = 'a') {
  return mount(wrap(Tabs.Root), {
    props: { defaultValue },
    slots: {
      default: () => [
        h(wrap(Tabs.List), null, {
          default: () => [
            h(wrap(Tabs.Trigger), { value: 'a' }, { default: () => 'Tab A' }),
            h(wrap(Tabs.Trigger), { value: 'b' }, { default: () => 'Tab B' }),
          ],
        }),
        h(wrap(Tabs.Content), { value: 'a' }, { default: () => 'Panel A' }),
        h(wrap(Tabs.Content), { value: 'b' }, { default: () => 'Panel B' }),
      ],
    },
  })
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Tabs — rendering', () => {
  it('renders without throwing', () => {
    expect(() => makeTabs()).not.toThrow()
  })

  it('renders a tablist', () => {
    const w = makeTabs()
    expect(w.element.querySelector('[role="tablist"]')).toBeTruthy()
  })

  it('renders tab triggers as buttons', () => {
    const w = makeTabs()
    expect(w.element.querySelectorAll('[role="tab"]')).toHaveLength(2)
  })

  it('renders the active panel', () => {
    const w = makeTabs('a')
    const panel = w.element.querySelector('[role="tabpanel"]')
    expect(panel).toBeTruthy()
    expect(panel!.textContent).toBe('Panel A')
  })

  it('does not render inactive panels', () => {
    const w = makeTabs('a')
    expect(w.element.querySelectorAll('[role="tabpanel"]')).toHaveLength(1)
  })
})

// ── ARIA wiring ───────────────────────────────────────────────────────────────

describe('Tabs — ARIA wiring', () => {
  it('marks the active trigger as selected', () => {
    const w = makeTabs('a')
    const [triggerA] = queryAll(w.element, '[role="tab"]')
    expect(triggerA!.getAttribute('aria-selected')).toBe('true')
  })

  it('marks the inactive trigger as not selected', () => {
    const w = makeTabs('a')
    const triggers = queryAll(w.element, '[role="tab"]')
    expect(triggers[1]!.getAttribute('aria-selected')).toBe('false')
  })

  it('wires aria-controls on trigger to panel id', () => {
    const w = makeTabs('a')
    const [triggerA] = queryAll(w.element, '[role="tab"]')
    const controls = triggerA!.getAttribute('aria-controls')!
    expect(w.element.querySelector(`#${controls}`)).toBeTruthy()
  })

  it('wires aria-labelledby on panel to trigger id', () => {
    const w = makeTabs('a')
    const panel = w.element.querySelector('[role="tabpanel"]')!
    const labelledBy = panel.getAttribute('aria-labelledby')!
    expect(w.element.querySelector(`#${labelledBy}`)).toBeTruthy()
  })

  it('sets data-state=active on the active trigger', () => {
    const w = makeTabs('a')
    const [triggerA] = queryAll(w.element, '[role="tab"]')
    expect(triggerA!.getAttribute('data-state')).toBe('active')
  })

  it('sets data-state=inactive on inactive triggers', () => {
    const w = makeTabs('a')
    const triggers = queryAll(w.element, '[role="tab"]')
    expect(triggers[1]!.getAttribute('data-state')).toBe('inactive')
  })
})

// ── Tab switching ─────────────────────────────────────────────────────────────

describe('Tabs — switching', () => {
  it('shows the correct panel on click', async () => {
    const w = makeTabs('a')
    const triggers = queryAll(w.element, '[role="tab"]')
    ;(triggers[1] as HTMLElement).click()
    await nextTick()
    const panel = w.element.querySelector('[role="tabpanel"]')!
    expect(panel.textContent).toBe('Panel B')
  })

  it('updates aria-selected after switching', async () => {
    const w = makeTabs('a')
    const triggers = queryAll(w.element, '[role="tab"]')
    ;(triggers[1] as HTMLElement).click()
    await nextTick()
    const updated = queryAll(w.element, '[role="tab"]')
    expect(updated[0]!.getAttribute('aria-selected')).toBe('false')
    expect(updated[1]!.getAttribute('aria-selected')).toBe('true')
  })
})

// ── Controlled mode ───────────────────────────────────────────────────────────

describe('Tabs — controlled mode', () => {
  it('respects an externally controlled value', () => {
    const w = mount(wrap(Tabs.Root), {
      props: { value: 'b' },
      slots: {
        default: () => [
          h(wrap(Tabs.List), null, {
            default: () => [
              h(wrap(Tabs.Trigger), { value: 'a' }, { default: () => 'Tab A' }),
              h(wrap(Tabs.Trigger), { value: 'b' }, { default: () => 'Tab B' }),
            ],
          }),
          h(wrap(Tabs.Content), { value: 'a' }, { default: () => 'Panel A' }),
          h(wrap(Tabs.Content), { value: 'b' }, { default: () => 'Panel B' }),
        ],
      },
    })
    expect(w.element.querySelector('[role="tabpanel"]')!.textContent).toBe('Panel B')
  })

  it('calls onValueChange when a trigger is clicked', async () => {
    let captured: string | undefined
    const w = mount(wrap(Tabs.Root), {
      props: {
        value: 'a',
        onValueChange: (v: string) => {
          captured = v
        },
      },
      slots: {
        default: () => [
          h(wrap(Tabs.List), null, {
            default: () => [
              h(wrap(Tabs.Trigger), { value: 'a' }, { default: () => 'Tab A' }),
              h(wrap(Tabs.Trigger), { value: 'b' }, { default: () => 'Tab B' }),
            ],
          }),
          h(wrap(Tabs.Content), { value: 'a' }, { default: () => 'Panel A' }),
          h(wrap(Tabs.Content), { value: 'b' }, { default: () => 'Panel B' }),
        ],
      },
    })
    const triggers = queryAll(w.element, '[role="tab"]')
    ;(triggers[1] as HTMLElement).click()
    await nextTick()
    expect(captured).toBe('b')
  })
})

// ── Indicator ─────────────────────────────────────────────────────────────────

describe('Tabs — Indicator', () => {
  it('renders with the active value as a data attribute', () => {
    const w = mount(wrap(Tabs.Root), {
      props: { defaultValue: 'a' },
      slots: {
        default: () => [
          h(wrap(Tabs.List), null, {
            default: () => [
              h(wrap(Tabs.Trigger), { value: 'a' }, { default: () => 'Tab A' }),
              h(wrap(Tabs.Indicator)),
            ],
          }),
          h(wrap(Tabs.Content), { value: 'a' }, { default: () => 'Panel A' }),
        ],
      },
    })
    const indicator = w.element.querySelector('[aria-hidden]')!
    expect(indicator.getAttribute('data-active-value')).toBe('a')
  })

  it('updates data-active-value after switching', async () => {
    const w = mount(wrap(Tabs.Root), {
      props: { defaultValue: 'a' },
      slots: {
        default: () => [
          h(wrap(Tabs.List), null, {
            default: () => [
              h(wrap(Tabs.Trigger), { value: 'a' }, { default: () => 'Tab A' }),
              h(wrap(Tabs.Trigger), { value: 'b' }, { default: () => 'Tab B' }),
              h(wrap(Tabs.Indicator)),
            ],
          }),
          h(wrap(Tabs.Content), { value: 'a' }, { default: () => 'Panel A' }),
          h(wrap(Tabs.Content), { value: 'b' }, { default: () => 'Panel B' }),
        ],
      },
    })
    const triggers = queryAll(w.element, '[role="tab"]')
    ;(triggers[1] as HTMLElement).click()
    await nextTick()
    expect(w.element.querySelector('[aria-hidden]')!.getAttribute('data-active-value')).toBe('b')
  })
})

// ── Context guard ─────────────────────────────────────────────────────────────

describe('Tabs — context guard', () => {
  it('throws when Trigger is rendered outside Tabs.Root', () => {
    expect(() => mount(wrap(Tabs.Trigger), { props: { value: 'x' } })).toThrow(
      'Tabs.* components must be rendered inside <Tabs.Root>.',
    )
  })
})
