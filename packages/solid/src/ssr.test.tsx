// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToString } from 'solid-js/web'
import { createPolymorphicComponent } from './create-polymorphic-component'

describe('createPolymorphicComponent — SSR (solid-js/web renderToString)', () => {
  it('renders to HTML without accessing browser globals', () => {
    const Comp = createPolymorphicComponent({ tag: 'div' })
    expect(() => renderToString(() => <Comp />)).not.toThrow()
  })

  it('applies base class in server-rendered HTML', () => {
    const Comp = createPolymorphicComponent({ tag: 'div', styling: { base: 'base-class' } })
    const html = renderToString(() => <Comp />)
    expect(html).toContain('base-class')
  })

  it('strips redundant ARIA role — server HTML agrees with what client hydration would produce', () => {
    const Comp = createPolymorphicComponent({ tag: 'button', enforcement: { strict: false } })
    const html = renderToString(() => <Comp role="button" />)
    // The redundant role should be stripped before serialisation
    expect(html).not.toContain('role=')
  })

  it('applies variant class in server-rendered HTML', () => {
    const Comp = createPolymorphicComponent({
      tag: 'div',
      styling: {
        base: 'box',
        variants: { intent: { primary: 'box--primary' } },
      },
    })
    const html = renderToString(() => <Comp intent="primary" />)
    expect(html).toContain('box--primary')
  })

  it('as prop overrides the default tag in server-rendered HTML', () => {
    const Comp = createPolymorphicComponent({ tag: 'div' })
    const html = renderToString(() => <Comp as="section" />)
    expect(html).toContain('<section')
    expect(html).not.toContain('<div')
  })
})
