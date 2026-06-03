import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { Root, List, Trigger, Content } from './tabs'

beforeAll(() => {
  customElements.define('example-tabs-root', Root as unknown as CustomElementConstructor)
  customElements.define('example-tabs-list', List as unknown as CustomElementConstructor)
  customElements.define('example-tabs-trigger', Trigger as unknown as CustomElementConstructor)
  customElements.define('example-tabs-content', Content as unknown as CustomElementConstructor)
})

afterEach(() => {
  document.body.innerHTML = ''
})

type TabsRoot = HTMLElement & { setActiveValue(v: string): void }

function buildTabs(activeValue?: string): {
  root: HTMLElement
  triggers: HTMLElement[]
  panels: HTMLElement[]
} {
  const root = document.createElement('example-tabs-root')
  if (activeValue) root.setAttribute('value', activeValue)

  const list = document.createElement('example-tabs-list')
  const triggers = ['a', 'b', 'c'].map((v) => {
    const el = document.createElement('example-tabs-trigger')
    el.setAttribute('value', v)
    el.textContent = `Tab ${v}`
    list.appendChild(el)
    return el as HTMLElement
  })
  root.appendChild(list)

  const panels = ['a', 'b', 'c'].map((v) => {
    const el = document.createElement('example-tabs-content')
    el.setAttribute('value', v)
    el.textContent = `Panel ${v}`
    root.appendChild(el)
    return el as HTMLElement
  })

  document.body.appendChild(root)
  return { root, triggers, panels }
}

function key(el: HTMLElement, k: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
}

// ─── ARIA roles ───────────────────────────────────────────────────────────────

describe('ARIA — roles', () => {
  it('trigger has role="tab"', () => {
    const { triggers } = buildTabs()
    expect(triggers[0]?.getAttribute('role')).toBe('tab')
  })

  it('content has role="tabpanel"', () => {
    const { panels } = buildTabs()
    expect(panels[0]?.getAttribute('role')).toBe('tabpanel')
  })

  it('list has role="tablist"', () => {
    const { root } = buildTabs()
    expect(root.querySelector('example-tabs-list')?.getAttribute('role')).toBe('tablist')
  })
})

// ─── ARIA state ───────────────────────────────────────────────────────────────

describe('ARIA — selected state', () => {
  it('active trigger has aria-selected="true"', () => {
    const { triggers } = buildTabs('a')
    expect(triggers[0]?.getAttribute('aria-selected')).toBe('true')
  })

  it('inactive trigger has aria-selected="false"', () => {
    const { triggers } = buildTabs('a')
    expect(triggers[1]?.getAttribute('aria-selected')).toBe('false')
  })

  it('aria-selected updates when active tab changes', () => {
    const { root, triggers } = buildTabs('a')
    ;(root as TabsRoot).setActiveValue('b')
    expect(triggers[0]?.getAttribute('aria-selected')).toBe('false')
    expect(triggers[1]?.getAttribute('aria-selected')).toBe('true')
  })
})

// ─── Initial state ────────────────────────────────────────────────────────────

describe('Root — initial state', () => {
  it('activates first trigger by default', () => {
    const { triggers } = buildTabs()
    expect(triggers[0]?.dataset.state).toBe('active')
    expect(triggers[1]?.dataset.state).toBe('inactive')
  })

  it('shows first panel by default, hides others', () => {
    const { panels } = buildTabs()
    expect(panels[0]?.hidden).toBe(false)
    expect(panels[1]?.hidden).toBe(true)
  })

  it('respects explicit value attribute', () => {
    const { triggers, panels } = buildTabs('b')
    expect(triggers[1]?.dataset.state).toBe('active')
    expect(panels[1]?.hidden).toBe(false)
    expect(panels[0]?.hidden).toBe(true)
  })

  it('sets data-value on root', () => {
    const { root } = buildTabs('b')
    expect((root as HTMLElement).dataset.value).toBe('b')
  })
})

// ─── Selection ────────────────────────────────────────────────────────────────

describe('Root — setActiveValue', () => {
  it('switches active trigger', () => {
    const { root, triggers } = buildTabs()
    ;(root as TabsRoot).setActiveValue('b')
    expect(triggers[1]?.dataset.state).toBe('active')
    expect(triggers[0]?.dataset.state).toBe('inactive')
  })

  it('shows the matching panel, hides others', () => {
    const { root, panels } = buildTabs()
    ;(root as TabsRoot).setActiveValue('c')
    expect(panels[2]?.hidden).toBe(false)
    expect(panels[0]?.hidden).toBe(true)
  })

  it('is idempotent — clicking the active tab again does not change state', () => {
    const { triggers, panels } = buildTabs('a')
    triggers[0]?.click()
    expect(triggers[0]?.dataset.state).toBe('active')
    expect(panels[0]?.hidden).toBe(false)
  })
})

// ─── Invalid value guard ──────────────────────────────────────────────────────

describe('Root — setActiveValue invalid guard', () => {
  it('falls back to first trigger when value is unrecognised', () => {
    const { root, triggers } = buildTabs()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ;(root as TabsRoot).setActiveValue('banana')
    expect(triggers[0]?.dataset.state).toBe('active')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('does not warn when called with a valid value', () => {
    const { root } = buildTabs()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ;(root as TabsRoot).setActiveValue('b')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

// ─── Event protocol ───────────────────────────────────────────────────────────

describe('Trigger — tabs:select event', () => {
  it('click dispatches tabs:select with value', () => {
    const { triggers } = buildTabs()
    let captured: string | undefined
    document.body.addEventListener('tabs:select', (e) => {
      captured = (e as CustomEvent<{ value: string }>).detail.value
    })
    triggers[1]?.click()
    expect(captured).toBe('b')
  })

  it('event bubbles to document', () => {
    const { triggers } = buildTabs()
    let fired = false
    document.addEventListener(
      'tabs:select',
      () => {
        fired = true
      },
      { once: true },
    )
    triggers[0]?.click()
    expect(fired).toBe(true)
  })

  it('click on trigger selects it via root', () => {
    const { triggers } = buildTabs()
    triggers[2]?.click()
    expect(triggers[2]?.dataset.state).toBe('active')
    expect(triggers[0]?.dataset.state).toBe('inactive')
  })
})

// ─── Keyboard navigation ──────────────────────────────────────────────────────

describe('Root — keyboard navigation', () => {
  it('ArrowRight moves focus and activates next trigger', () => {
    const { triggers } = buildTabs('a')
    triggers[0]?.focus()
    key(triggers[0]!, 'ArrowRight')
    expect(triggers[1]?.dataset.state).toBe('active')
    expect(document.activeElement).toBe(triggers[1])
  })

  it('ArrowLeft moves focus and activates previous trigger', () => {
    const { triggers } = buildTabs('b')
    triggers[1]?.focus()
    key(triggers[1]!, 'ArrowLeft')
    expect(triggers[0]?.dataset.state).toBe('active')
    expect(document.activeElement).toBe(triggers[0])
  })

  it('ArrowRight wraps from last to first', () => {
    const { triggers } = buildTabs('c')
    triggers[2]?.focus()
    key(triggers[2]!, 'ArrowRight')
    expect(triggers[0]?.dataset.state).toBe('active')
    expect(document.activeElement).toBe(triggers[0])
  })

  it('ArrowLeft wraps from first to last', () => {
    const { triggers } = buildTabs('a')
    triggers[0]?.focus()
    key(triggers[0]!, 'ArrowLeft')
    expect(triggers[2]?.dataset.state).toBe('active')
    expect(document.activeElement).toBe(triggers[2])
  })

  it('Home moves focus to first trigger', () => {
    const { triggers } = buildTabs('c')
    triggers[2]?.focus()
    key(triggers[2]!, 'Home')
    expect(triggers[0]?.dataset.state).toBe('active')
    expect(document.activeElement).toBe(triggers[0])
  })

  it('End moves focus to last trigger', () => {
    const { triggers } = buildTabs('a')
    triggers[0]?.focus()
    key(triggers[0]!, 'End')
    expect(triggers[2]?.dataset.state).toBe('active')
    expect(document.activeElement).toBe(triggers[2])
  })

  it('panel visibility follows keyboard navigation', () => {
    const { triggers, panels } = buildTabs('a')
    triggers[0]?.focus()
    key(triggers[0]!, 'ArrowRight')
    key(triggers[1]!, 'ArrowRight')
    key(triggers[2]!, 'ArrowLeft')
    expect(panels[1]?.hidden).toBe(false)
    expect(panels[0]?.hidden).toBe(true)
    expect(panels[2]?.hidden).toBe(true)
  })

  it('ignores keydown from non-trigger elements', () => {
    const { root, triggers } = buildTabs('a')
    key(root, 'ArrowRight')
    expect(triggers[0]?.dataset.state).toBe('active')
  })
})

// ─── Controlled mode ─────────────────────────────────────────────────────────

describe('Root — controlled via value attribute', () => {
  it('changing value attribute updates active state', () => {
    const { root, triggers, panels } = buildTabs('a')
    root.setAttribute('value', 'b')
    expect(triggers[1]?.dataset.state).toBe('active')
    expect(panels[1]?.hidden).toBe(false)
    expect(panels[0]?.hidden).toBe(true)
  })
})

// ─── Children enforcement ─────────────────────────────────────────────────────

describe('Root — children enforcement', () => {
  it('resolves successfully with valid structure', () => {
    expect(() => buildTabs()).not.toThrow()
  })
})
