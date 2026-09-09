// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import Polymorphic from './Polymorphic.svelte'
import { createContractComponent } from './create-contract-component'

afterEach(cleanup)

// Polymorphic.svelte's serializeStyle turns a style *object* into the CSS text
// <svelte:element>'s style attribute needs. Its camelCase→kebab-case rewrite
// (key.replace(/([A-Z])/g, '-$1').toLowerCase()) happens to preserve a CSS custom property and
// correctly hyphenate a vendor-prefixed one — pinned here as an explicit contract, not left as an
// implementation detail a future refactor could break silently.
//
// Assertions go through the parsed CSSStyleDeclaration (`el.style.*`), not the raw `style`
// attribute string: the browser's own CSS parser reflows what we hand it (adds spaces, and — for
// a length property — a unit onto a bare "0"), so the literal string `serializeStyle` produces is
// an implementation detail; what a real element's style resolves to is the actual contract.

function styleOf(container: HTMLElement): CSSStyleDeclaration {
  return (container.querySelector('div') as HTMLElement).style
}

describe('style object serialization', () => {
  it('preserves a CSS custom property untouched (no uppercase letters to rewrite)', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, style: { '--my-color': 'red' } })
    expect(styleOf(container).getPropertyValue('--my-color')).toBe('red')
  })

  it('hyphenates a vendor-prefixed camelCase property with its leading dash', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, {
      bundle,
      style: { WebkitLineClamp: 2 },
    })
    // The regex prepends "-" before every uppercase letter, including the leading one — which is
    // exactly the real CSS property spelling for a vendor prefix (-webkit-line-clamp).
    expect(styleOf(container).getPropertyValue('-webkit-line-clamp')).toBe('2')
  })

  it('keeps a falsy but real value — 0 is not treated as absent', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, {
      bundle,
      style: { opacity: 0, marginTop: 0 },
    })
    const style = styleOf(container)
    expect(style.opacity).toBe('0')
    // A unitless "0" for a length property is valid CSS; the browser's own parser normalizes it
    // to "0px" on reflection — that normalization, not a literal "0", is the real contract here.
    expect(style.marginTop).toBe('0px')
  })

  it('drops an undefined value entirely, not as an empty declaration', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, {
      bundle,
      style: { color: 'red', customProperty: undefined },
    })
    const style = styleOf(container)
    expect(style.color).toBe('red')
    expect(style.getPropertyValue('customProperty')).toBe('')
    expect(style.getPropertyValue('custom-property')).toBe('')
  })

  it('a plain style string still passes through unserialized', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, style: 'color: blue;' })
    expect(styleOf(container).color).toBe('blue')
  })
})
