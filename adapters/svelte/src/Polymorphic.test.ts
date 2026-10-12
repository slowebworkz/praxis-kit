// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { silentDiagnostics, throwDiagnostics, warnDiagnostics } from '@praxis-kit/diagnostics'
import Polymorphic from './Polymorphic.svelte'
import InnerButton from './component-reference-as.test-host.svelte'
import { createContractComponent } from './create-contract-component'
import type { AnyRecord } from '@praxis-kit/primitive'

afterEach(cleanup)

describe('Polymorphic (Svelte adapter)', () => {
  it('renders the default tag', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle })
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, as: 'section' })
    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('renders through a component reference passed as "as", not just a tag-name string', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, as: InnerButton as never })
    expect(container.querySelector('[data-testid="inner"]')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('merges base class onto a component-reference "as" target, same as a tag target', () => {
    const bundle = createContractComponent({ tag: 'div', styling: { base: 'base-class' } })
    const { container } = render(Polymorphic, { bundle, as: InnerButton as never })
    expect(container.querySelector('[data-testid="inner"]')?.className).toBe('base-class')
  })

  it('"as" + "asChild" together are still mutually exclusive when "as" is a component reference', () => {
    const bundle = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: throwDiagnostics },
    })
    const children = createRawSnippet<[AnyRecord]>(() => ({
      render: () => '<a href="/home">Home</a>',
    }))
    expect(() =>
      render(Polymorphic, { bundle, as: InnerButton as never, asChild: true, children }),
    ).toThrow('"as" and "asChild" are mutually exclusive')
  })

  it('applies base class', () => {
    const bundle = createContractComponent({ tag: 'div', styling: { base: 'base-class' } })
    const { container } = render(Polymorphic, { bundle })
    expect(container.querySelector('div')?.className).toBe('base-class')
  })

  it('merges caller class with base', () => {
    const bundle = createContractComponent({ tag: 'div', styling: { base: 'base' } })
    const { container } = render(Polymorphic, { bundle, class: 'caller' })
    const cls = container.querySelector('div')?.className
    expect(cls).toContain('base')
    expect(cls).toContain('caller')
  })

  it('passes extra props to the DOM element', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, 'data-testid': 'box' })
    expect(container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('strips redundant ARIA role from intrinsic element', () => {
    const bundle = createContractComponent({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const { container } = render(Polymorphic, { bundle, role: 'button' })
    expect(container.querySelector('button')?.getAttribute('role')).toBeNull()
  })

  it('applies variant classes', () => {
    const bundle = createContractComponent({
      tag: 'div',
      styling: {
        base: 'box',
        variants: { size: { sm: 'box--sm', lg: 'box--lg' } },
      },
    })
    const { container } = render(Polymorphic, { bundle, size: 'sm' })
    expect(container.querySelector('div')?.className).toContain('box--sm')
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const bundle = createContractComponent({
      tag: 'div',
      filterProps: (key) => key === 'myProp',
    })
    const { container } = render(Polymorphic, { bundle, myProp: 'should-be-stripped' })
    expect(container.querySelector('[myProp]')).toBeNull()
    expect(container.querySelector('[myprop]')).toBeNull()
  })

  describe('asChild', () => {
    it('renders the slot snippet instead of the host element', () => {
      const bundle = createContractComponent({ tag: 'div' })
      const children = createRawSnippet<[AnyRecord]>(() => ({
        render: () => '<a href="/home">Home</a>',
      }))
      const { container } = render(Polymorphic, { bundle, asChild: true, children })
      expect(container.querySelector('a')).toBeTruthy()
      expect(container.querySelector('div')).toBeNull()
    })

    it('forwards class and props to the slot snippet', () => {
      const bundle = createContractComponent({ tag: 'div', styling: { base: 'base-class' } })
      let receivedProps: AnyRecord = {}
      const children = createRawSnippet<[AnyRecord]>((getProps) => ({
        render() {
          receivedProps = getProps()
          return `<a>link</a>`
        },
      }))
      render(Polymorphic, { bundle, asChild: true, children, 'data-extra': 'yes' })
      expect(receivedProps['class']).toContain('base-class')
      expect(receivedProps['data-extra']).toBe('yes')
    })

    it('forwards resolved variant classes to the slot snippet', () => {
      const bundle = createContractComponent({
        tag: 'div',
        styling: {
          base: 'box',
          variants: { size: { sm: 'box--sm', lg: 'box--lg' } },
        },
      })
      let receivedProps: AnyRecord = {}
      const children = createRawSnippet<[AnyRecord]>((getProps) => ({
        render() {
          receivedProps = getProps()
          return `<a>link</a>`
        },
      }))
      render(Polymorphic, { bundle, asChild: true, children, size: 'sm' })
      expect(receivedProps['class']).toContain('box')
      expect(receivedProps['class']).toContain('box--sm')
    })

    // Unlike the non-asChild <svelte:element> path (buildDomProps), which strips a role that's
    // redundant with the *target tag's own* implicit role via runtime.resolveAria, the asChild
    // path (buildSlotProps) has no target tag to check redundancy against — the caller's snippet
    // decides what element to render. It only validates that the role is a real ARIA role
    // (isKnownAriaRole) and forwards it as-is; it never strips a role for being redundant. Same
    // contract as Solid's buildSlotProps (adapters/solid/src/render.tsx).
    it('forwards a syntactically valid ARIA role to the slot snippet (no redundancy check — there is no target tag to check against)', () => {
      const bundle = createContractComponent({ tag: 'button' })
      let receivedProps: AnyRecord = {}
      const children = createRawSnippet<[AnyRecord]>((getProps) => ({
        render() {
          receivedProps = getProps()
          return `<a>link</a>`
        },
      }))
      render(Polymorphic, { bundle, asChild: true, children, role: 'button' })
      expect(receivedProps['role']).toBe('button')
    })

    it('omits an invalid (non-ARIA) role from the slot snippet', () => {
      const bundle = createContractComponent({ tag: 'button' })
      let receivedProps: AnyRecord = {}
      const children = createRawSnippet<[AnyRecord]>((getProps) => ({
        render() {
          receivedProps = getProps()
          return `<a>link</a>`
        },
      }))
      render(Polymorphic, { bundle, asChild: true, children, role: 'not-a-real-role' })
      expect(receivedProps['role']).toBeUndefined()
    })

    // Reactivity (does the slot snippet re-render with a new resolved class when a prop
    // changes?) can't be tested here — createRawSnippet's params are captured once and are
    // documented by Svelte as non-reactive. See asChild-reactivity.test.ts, which drives this
    // through a real $state host instead.

    it('falls back to normal render when asChild is false', () => {
      const bundle = createContractComponent({ tag: 'section' })
      // Without asChild, host element is preserved and snippet renders inside it
      const children = createRawSnippet(() => ({
        render: () => '<span>text</span>',
      }))
      const { container } = render(Polymorphic, { bundle, asChild: false, children })
      expect(container.querySelector('section')).toBeTruthy()
      expect(container.querySelector('section > span')).toBeTruthy()
    })

    it('throws when as and asChild are both set (strict: throw)', () => {
      const bundle = createContractComponent({
        tag: 'div',
        enforcement: { diagnostics: throwDiagnostics },
      })
      const children = createRawSnippet<[AnyRecord]>(() => ({
        render: () => '<a>link</a>',
      }))
      expect(() => render(Polymorphic, { bundle, asChild: true, as: 'span', children })).toThrow()
    })

    // strict:'throw' above pins the default. strict:'warn' reports instead of throwing (the
    // exclusivity check routes through InvariantBase.violate, capped at warn under
    // warnDiagnostics' throwThreshold), so useAsChild resolves to false without unwinding the
    // render — Polymorphic falls through to its {:else} branch, the ordinary <svelte:element>
    // render at the `as`-resolved tag, exactly as if asChild had never been set. Same contract
    // as the Solid adapter's equivalent guard (see its DECISIONS.md entry).
    it('as + asChild both set in warn mode: warns and falls back to the ordinary render using `as`', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const bundle = createContractComponent({
        tag: 'div',
        enforcement: { diagnostics: warnDiagnostics },
      })
      const children = createRawSnippet<[AnyRecord]>(() => ({
        render: () => '<a>link</a>',
      }))
      const { container } = render(Polymorphic, {
        bundle,
        asChild: true,
        as: 'section',
        children,
      })
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('"as" and "asChild" are mutually exclusive'),
      )
      expect(container.querySelector('section')).toBeTruthy()
      expect(container.querySelector('div')).toBeNull()
      warn.mockRestore()
    })
  })

  describe('allowedAs — component references', () => {
    it('allows an "as" component reference that is listed by reference in allowedAs', () => {
      const bundle = createContractComponent({
        tag: 'div',
        enforcement: { diagnostics: throwDiagnostics, allowedAs: [InnerButton] },
      })
      expect(() => render(Polymorphic, { bundle, as: InnerButton as never })).not.toThrow()
    })

    it('rejects an "as" component reference not listed in allowedAs', () => {
      // Reuses the same real, renderable `InnerButton` fixture as the passing case above —
      // deliberately not a bare placeholder function — so the only variable between the two
      // tests is whether the reference appears in `allowedAs`, not whether Svelte's own dynamic-
      // component resolution can do anything with the value at all.
      const bundle = createContractComponent({
        tag: 'div',
        enforcement: { diagnostics: throwDiagnostics, allowedAs: ['section'] },
      })
      expect(() => render(Polymorphic, { bundle, as: InnerButton as never })).toThrow(/allowed/i)
    })
  })

  describe('compose: declarative asChild composition', () => {
    // `compose`'s renders-through/tag-conflict/props-land cases are covered by the shared
    // conformance suite (`conformance.test.ts` → `lib/adapter-utils/src/testing/conformance.ts`,
    // "conformance — compose"). That suite can't express two cases for Svelte: "explicit asChild
    // wins" (its own `asChild: false` capability — Svelte's asChild needs a literal snippet
    // child) and ref-forwarding (Svelte has no `createRef`-style contract; `onElement` is this
    // adapter's real one) — those two stay adapter-specific below, same convention `asChild`
    // itself already uses.

    it('onElement receives the composing component\'s own real element, not "with"\'s default tag', () => {
      let received: Element | undefined
      const boxA = createContractComponent({ tag: 'nav' })
      const boxB = createContractComponent({
        tag: 'button',
        compose: { with: boxA },
        onElement: (el) => {
          received = el
        },
      })

      render(Polymorphic, { bundle: boxB })

      expect(received?.tagName.toLowerCase()).toBe('button')
    })

    it('an explicit asChild from the consumer wins over compose', () => {
      const boxA = createContractComponent({ tag: 'div', styling: { base: 'class-a' } })
      const boxB = createContractComponent({
        tag: 'button',
        compose: { with: boxA },
        styling: { base: 'class-b' },
      })

      let receivedProps: AnyRecord = {}
      const children = createRawSnippet<[AnyRecord]>((getProps) => ({
        render() {
          receivedProps = getProps()
          return `<a>link</a>`
        },
      }))

      const { container } = render(Polymorphic, { bundle: boxB, asChild: true, children })

      // Only boxB's own asChild composes onto <a> — compose doesn't fire, so boxA never renders.
      expect(receivedProps['class']).toContain('class-b')
      expect(receivedProps['class']).not.toContain('class-a')
      expect(container.querySelector('button')).toBeNull()
    })
  })
})
