import { describe, expect, it } from 'vitest'
import type { ElementType } from '@praxis-kit/core'
import { renderBundleToString } from './render-to-string'
import type { SsrBundle } from './render-to-string'

// Neither current caller of renderBundleToString (adapters/lit, adapters/web) ever lets an `as`
// prop reach it — both strip it before calling in, for their own reason (no tag polymorphism, see
// their render-to-string.ts doc comments), not for safety. That means this exact boundary can't be
// exercised through either adapter's own ssr.test.ts, only by calling renderBundleToString
// directly with a minimal fake bundle, as below — this file exists specifically to cover the path
// their own test suites structurally cannot reach.
function fakeBundle(overrides: Partial<SsrBundle['runtime']['options']> = {}): SsrBundle {
  return {
    filterProps: () => false,
    runtime: {
      resolveTag: (as?: ElementType) => as ?? 'div',
      resolveProps: (props) => props,
      resolveClasses: () => {},
      resolveAria: (_tag, props) => ({ props }),
      options: {
        variantKeys: new Set(),
        ...overrides,
      },
    },
  }
}

describe('renderBundleToString — tag serialization safety', () => {
  it('renders a normal tag', () => {
    expect(renderBundleToString(fakeBundle())).toBe('<div></div>')
  })

  it('accepts a hyphenated custom-element-style tag', () => {
    const html = renderBundleToString(fakeBundle(), { as: 'my-widget' })
    expect(html).toBe('<my-widget></my-widget>')
  })

  it('throws rather than serializing a tag containing a markup delimiter', () => {
    expect(() =>
      renderBundleToString(fakeBundle(), { as: 'div><script>alert(1)</script' }),
    ).toThrow('[renderBundleToString]')
  })

  it('throws rather than serializing a tag containing whitespace (attribute injection shape)', () => {
    expect(() => renderBundleToString(fakeBundle(), { as: 'div onmouseover=alert(1)' })).toThrow(
      '[renderBundleToString]',
    )
  })

  it('throws on an empty tag', () => {
    expect(() => renderBundleToString(fakeBundle(), { as: '' })).toThrow('[renderBundleToString]')
  })

  it('throws on a tag starting with a digit or hyphen', () => {
    expect(() => renderBundleToString(fakeBundle(), { as: '1foo' })).toThrow(
      '[renderBundleToString]',
    )
    expect(() => renderBundleToString(fakeBundle(), { as: '-foo' })).toThrow(
      '[renderBundleToString]',
    )
  })

  it('enforces the same check even when the tag comes from options.tag rather than `as`', () => {
    // resolveTag here ignores `as` entirely and always returns the (malicious) default — modeling
    // a hypothetical dynamically-configured `options.tag`, not just a caller-supplied `as`.
    const bundle: SsrBundle = {
      filterProps: () => false,
      runtime: {
        resolveTag: () => 'div onmouseover=alert(1)',
        resolveProps: (props) => props,
        resolveClasses: () => {},
        resolveAria: (_tag, props) => ({ props }),
        options: { variantKeys: new Set() },
      },
    }
    expect(() => renderBundleToString(bundle)).toThrow('[renderBundleToString]')
  })
})
