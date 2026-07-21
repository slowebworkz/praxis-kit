// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render as solidRender, cleanup } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from './create-contract-component'

afterEach(cleanup)

describe('createContractComponent (Solid adapter)', () => {
  it('sets displayName', () => {
    const Comp = createContractComponent({ name: 'MyBox', tag: 'div' })
    expect(Comp.displayName).toBe('MyBox')
  })

  it('falls back to PolymorphicComponent displayName', () => {
    const Comp = createContractComponent({ tag: 'div' })
    expect(Comp.displayName).toBe('PolymorphicComponent')
  })

  it('renders the default tag', () => {
    const Comp = createContractComponent({ tag: 'div' })
    const { container } = solidRender(() => <Comp />)
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const Comp = createContractComponent({ tag: 'div' })
    const { container } = solidRender(() => <Comp as="section" />)
    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('applies base class', () => {
    const Comp = createContractComponent({ tag: 'div', styling: { base: 'base-class' } })
    const { container } = solidRender(() => <Comp />)
    expect(container.querySelector('div')?.className).toBe('base-class')
  })

  it('merges caller class with base', () => {
    const Comp = createContractComponent({ tag: 'div', styling: { base: 'base' } })
    const { container } = solidRender(() => <Comp class="caller" />)
    expect(container.querySelector('div')?.className).toContain('base')
    expect(container.querySelector('div')?.className).toContain('caller')
  })

  it('forwards a ref to the DOM element', () => {
    const Comp = createContractComponent({ tag: 'div' })
    let el: HTMLDivElement | undefined
    solidRender(() => (
      <Comp
        ref={(e: HTMLDivElement) => {
          el = e
        }}
      />
    ))
    expect(el).toBeInstanceOf(HTMLDivElement)
  })

  it('forwards a ref when rendered as a different tag', () => {
    const Comp = createContractComponent({ tag: 'div' })
    let el: HTMLButtonElement | undefined
    solidRender(() => (
      <Comp
        as="button"
        ref={(e: HTMLButtonElement) => {
          el = e
        }}
      />
    ))
    expect(el).toBeInstanceOf(HTMLButtonElement)
  })

  it('passes extra props to the DOM element', () => {
    const Comp = createContractComponent({ tag: 'div' })
    const { container } = solidRender(() => <Comp data-testid="box" />)
    expect(container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('renders children', () => {
    const Comp = createContractComponent({ tag: 'div' })
    const { getByText } = solidRender(() => <Comp>hello</Comp>)
    expect(getByText('hello')).toBeTruthy()
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const Comp = createContractComponent<'div', { myProp?: string }>({
      tag: 'div',
      filterProps: (key) => key === 'myProp',
    })
    const { container } = solidRender(() => <Comp myProp="should-be-stripped" />)
    expect(container.querySelector('[myProp]')).toBeNull()
    expect(container.querySelector('[myprop]')).toBeNull()
  })

  it('strips redundant ARIA role from intrinsic element', () => {
    const Comp = createContractComponent({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const { container } = solidRender(() => <Comp role="button" />)
    // button has an implicit role="button" — redundant role should be stripped
    expect(container.querySelector('button')?.getAttribute('role')).toBeNull()
  })

  it('applies variant classes', () => {
    const Comp = createContractComponent({
      tag: 'div',
      styling: {
        base: 'box',
        variants: { size: { sm: 'box--sm', lg: 'box--lg' } },
      },
    })
    const { container } = solidRender(() => <Comp size="sm" />)
    expect(container.querySelector('div')?.className).toContain('box--sm')
  })

  it('reacts to signal-driven as prop change', () => {
    const Comp = createContractComponent({ tag: 'div' })
    const [tag, setTag] = createSignal<'div' | 'section'>('div')
    const { container } = solidRender(() => <Comp as={tag()} />)
    expect(container.querySelector('div')).toBeTruthy()
    setTag('section')
    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('reacts to signal-driven class change', () => {
    const Comp = createContractComponent({ tag: 'div', styling: { base: 'base' } })
    const [extra, setExtra] = createSignal('a')
    const { container } = solidRender(() => <Comp class={extra()} />)
    expect(container.querySelector('div')?.className).toContain('a')
    setExtra('b')
    expect(container.querySelector('div')?.className).toContain('b')
    expect(container.querySelector('div')?.className).not.toContain(' a')
  })

  it('asChild renders the child returned by the render function', () => {
    const Comp = createContractComponent({ tag: 'div', styling: { base: 'box' } })
    const { container } = solidRender(() => (
      <Comp asChild>{(props) => <a href="/home" {...props} />}</Comp>
    ))
    expect(container.querySelector('a')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('asChild passes resolved class to the render function', () => {
    const Comp = createContractComponent({ tag: 'div', styling: { base: 'box' } })
    const { container } = solidRender(() => <Comp asChild>{(props) => <a {...props} />}</Comp>)
    expect(container.querySelector('a')?.className).toBe('box')
  })

  it('asChild render function receives merged default props', () => {
    const Comp = createContractComponent({ tag: 'button', defaults: { type: 'button' } })
    const { container } = solidRender(() => <Comp asChild>{(props) => <button {...props} />}</Comp>)
    expect(container.querySelector('button')?.getAttribute('type')).toBe('button')
  })

  it('asChild: child props override slot props when spread after', () => {
    const Comp = createContractComponent({ tag: 'div', defaults: { 'data-slot': 'yes' } })
    const { container } = solidRender(() => (
      <Comp asChild>{(props) => <a {...props} data-slot="no" />}</Comp>
    ))
    expect(container.querySelector('a')?.getAttribute('data-slot')).toBe('no')
  })

  it('asChild forwards ref to the rendered element', () => {
    const Comp = createContractComponent({ tag: 'div' })
    let el: HTMLAnchorElement | undefined
    solidRender(() => (
      <Comp
        asChild
        ref={(e: HTMLAnchorElement) => {
          el = e
        }}
      >
        {(props) => <a href="/home" {...props} />}
      </Comp>
    ))
    expect(el).toBeInstanceOf(HTMLAnchorElement)
  })

  it('asChild throws when as and asChild are both set (strict: throw default)', () => {
    const Comp = createContractComponent({ tag: 'div' })
    expect(() =>
      solidRender(() => (
        // @ts-expect-error — intentionally invalid: as + asChild together
        <Comp as="section" asChild>
          {(props: Record<string, unknown>) => <a {...props} />}
        </Comp>
      )),
    ).toThrow()
  })

  it('asChild throws when children is not a function', () => {
    const Comp = createContractComponent({ tag: 'div' })
    expect(() =>
      solidRender(() => (
        // @ts-expect-error — intentionally invalid: children must be a render fn
        <Comp asChild>not a function</Comp>
      )),
    ).toThrow()
  })

  it('asChild reacts to signal-driven class changes', () => {
    const Comp = createContractComponent({ tag: 'div', styling: { base: 'base' } })
    const [extra, setExtra] = createSignal('a')
    const { container } = solidRender(() => (
      <Comp asChild class={extra()}>
        {(props) => <a {...props} />}
      </Comp>
    ))
    expect(container.querySelector('a')?.className).toContain('a')
    setExtra('b')
    expect(container.querySelector('a')?.className).toContain('b')
    expect(container.querySelector('a')?.className).not.toContain(' a')
  })

  it('enforcement.children throws when child rules are violated', () => {
    const Comp =
      // eslint-disable-next-line @praxis-kit/no-enforcement-without-strict -- intentionally tests the adapter default (Solid defaults to 'throw')
      createContractComponent({
        tag: 'div',
        enforcement: {
          exclusiveChildren: true,
          children: [
            { name: 'Button', match: (c): c is Element => (c as Element)?.tagName === 'BUTTON' },
          ],
        },
      })
    expect(() =>
      solidRender(() => (
        <Comp>
          <span>not a button</span>
        </Comp>
      )),
    ).toThrow()
  })
})

// Regression coverage for a divergence between JSX's own attribute checking and a direct
// prop-type extraction (the mechanism a tool like Storybook uses to type `args`/`argTypes` — via
// `Parameters<typeof Component>[0]`, since Solid has no built-in `ComponentProps` helper).
// TypeScript resolves a conditional/inferred type against an overloaded call signature using
// only its last member, and the only overload was generic with no call site to infer `TAs`
// from — so a native attribute like `disabled` used to vanish from the extracted type even
// though it worked fine directly in JSX.
describe('extracted prop type — extraction outside JSX', () => {
  const Button = createContractComponent({ tag: 'button', name: 'Button' })
  void Button
  type ButtonProps = Parameters<typeof Button>[0]

  it('includes a native attribute of the default element (disabled)', () => {
    const props: ButtonProps = { disabled: true }
    void props
  })

  it('includes an intrinsic attribute alongside disabled (type)', () => {
    const props: ButtonProps = { disabled: true, type: 'submit' }
    void props
  })
})
