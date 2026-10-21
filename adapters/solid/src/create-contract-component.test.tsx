// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render as solidRender, cleanup } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { silentDiagnostics, warnDiagnostics } from '@praxis-kit/diagnostics'
import { createTailwindPipeline } from '@praxis-kit/tailwind'
import { createContractComponent } from './create-contract-component'
import type { AnyRecord } from '@praxis-kit/primitive'

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

  it('as={Component}: renders through the referenced component via <Dynamic>, not the default tag', () => {
    // Solid already handles a component-valued `as` mechanically — `resolveTag`/`<Dynamic
    // component={tag()}>` are reference-safe with no special casing needed. This test is the
    // type-level proof (it compiles and renders with no cast), mirroring the equivalent React/
    // Preact tests.
    const Inner = (props: Record<string, unknown>) => <button data-testid="inner" {...props} />
    const Comp = createContractComponent({ tag: 'div' })
    const { container } = solidRender(() => <Comp as={Inner} />)
    expect(container.querySelector('[data-testid="inner"]')).toBeTruthy()
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
    const Comp = createContractComponent({
      tag: 'div',
      filterProps: (key) => key === 'myProp',
    })
    const { container } = solidRender(() => (
      // myProp isn't a declared prop of Comp; spreading requires an object type (unlike
      // `as never`, used elsewhere in this file for a non-spread position), so `any` is the
      // escape hatch here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Comp {...({ myProp: 'should-be-stripped' } as any)} />
    ))
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
    const { container } = solidRender(() => (
      // `type` is now recovered from `defaults` as a widened `string` (see WidenShallow in
      // contract-model.ts) rather than `EmptyRecord` — genuinely broader than
      // `ButtonHTMLAttributes['type']`'s literal union, so a render function spreading straight
      // onto a real `<button>` casts locally, matching `ResolvedSlotProps`'s own documented
      // guidance ("a render function that needs it casts locally"). `any`, not a narrower cast:
      // spreading requires an object type, and the actual mismatch is a widened `string` vs a
      // literal union, not a shape any narrower object type would paper over cleanly.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Comp asChild>{(props) => <button {...(props as any)} />}</Comp>
    ))
    expect(container.querySelector('button')?.getAttribute('type')).toBe('button')
  })

  it('asChild: child props override slot props when spread after', () => {
    const Comp = createContractComponent({ tag: 'div', defaults: { 'data-slot': 'yes' } })
    const { container } = solidRender(() => (
      <Comp asChild>{(props) => <a {...props} data-slot="no" />}</Comp>
    ))
    expect(container.querySelector('a')?.getAttribute('data-slot')).toBe('no')
  })

  it('asChild updates the mounted element in place and runs the render function once', () => {
    // A slot-prop change (here, the resolved class) must not re-run the render function and
    // rebuild its element: that would drop focus, uncontrolled input state, and any ref held on
    // the element.
    const Comp = createContractComponent({ tag: 'div', styling: { base: 'base' } })
    const [extra, setExtra] = createSignal('a')
    let renderFnCalls = 0
    const { container } = solidRender(() => (
      <Comp asChild class={extra()}>
        {(props) => {
          renderFnCalls++
          return <a {...props} />
        }}
      </Comp>
    ))
    const element = container.querySelector('a')!

    setExtra('b')

    expect(container.querySelector('a')).toBe(element)
    expect(element.className).toContain('b')
    expect(element.className).not.toContain(' a')
    expect(renderFnCalls).toBe(1)
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

  // `compose`'s renders-through/tag-conflict/props-land/ref cases are covered by the shared
  // conformance suite (`conformance.test.tsx` → `lib/adapter-utils/src/testing/conformance.ts`,
  // "conformance — compose"). That suite can't express the "explicit asChild wins" case for
  // Solid, though (its own `asChild: false` capability — Solid's asChild needs a literal
  // render-function child, incompatible with the harness's `ChildSpec`), so this one case stays
  // adapter-specific, same convention `asChild` itself already uses.

  it('compose: a class supplied through compose.defaults survives combined styling', () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: {
        base: 'partner-base',
        variants: { intent: { ghost: 'partner-ghost', solid: 'partner-solid' } },
      },
    })
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: Surface, defaults: { class: 'default-class', intent: 'ghost' } },
      styling: {
        base: 'primary-base',
        variants: { intent: { ghost: 'primary-ghost', solid: 'primary-solid' } },
        defaults: { intent: 'solid' },
      },
    })

    const { container } = solidRender(() => <Card class="caller-class" />)
    const className = container.querySelector('div')!.className

    expect(className).toContain('default-class')
    expect(className).toContain('caller-class')
    expect(className).toContain('partner-base')
    expect(className).toContain('primary-base')
    expect(className).toContain('partner-solid')
    expect(className).not.toContain('partner-ghost')
    expect(className).not.toContain('primary-ghost')
  })

  it('compose: reactively updates plugin-owned flex styling selected from the partner', () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: { base: 'grid-cols-3 gap-4', plugin: createTailwindPipeline },
    })
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: Surface },
      styling: { base: 'rounded' },
    })
    const [flex, setFlex] = createSignal(false)
    const { container } = solidRender(() => (
      <Card
        {...({
          get flex() {
            return flex()
          },
        } as AnyRecord)}
      />
    ))
    const element = container.querySelector('div')!

    // Without a display prop the Tailwind plugin drops container utilities (`grid-cols-3`,
    // `gap-4`); `flex` selects the flex family, which keeps `gap-4` and still drops `grid-cols-3`.
    expect(element.className).toContain('rounded')
    expect(element.className).not.toContain('flex')
    expect(element.className).not.toContain('gap-4')

    setFlex(true)
    expect(container.querySelector('div')).toBe(element)
    expect(element.className).toContain('flex')
    expect(element.className).toContain('gap-4')
    expect(element.className).not.toContain('grid-cols-3')

    setFlex(false)
    expect(element.className).not.toContain('flex')
    expect(element.className).not.toContain('gap-4')
    expect(element.className).toContain('rounded')
  })

  it('compose: updates both styling contributions when a shared variant changes', () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: {
        base: 'partner-base',
        variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
      },
    })
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: Surface },
      styling: {
        base: 'primary-base',
        variants: { tone: { quiet: 'primary-quiet', loud: 'primary-loud' } },
      },
    })
    const [tone, setTone] = createSignal<'quiet' | 'loud'>('quiet')
    const { container } = solidRender(() => <Card tone={tone()} />)

    const element = container.querySelector('div')!
    expect(element.className).toContain('partner-quiet')
    expect(element.className).toContain('primary-quiet')

    setTone('loud')

    expect(element.className).toContain('partner-loud')
    expect(element.className).toContain('primary-loud')
    expect(element.className).not.toContain('partner-quiet')
    expect(element.className).not.toContain('primary-quiet')
  })

  it('compose: reactively resolves a partner-only recipe', () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: {
        base: 'partner-base',
        variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
        presets: { emphasis: { tone: 'loud' } },
      },
    })
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: Surface },
      styling: { base: 'primary-base' },
    })
    const [recipe, setRecipe] = createSignal<string | undefined>(undefined)
    const { container } = solidRender(() => (
      // `emphasis` belongs only to Surface. Spread keeps this runtime regression test focused on
      // forwarding rather than requiring the primary component to declare the partner's recipe.
      <Card
        {...({
          get recipe() {
            return recipe()
          },
        } as AnyRecord)}
      />
    ))

    const element = container.querySelector('div')!
    expect(element.className).toContain('partner-base')
    expect(element.className).toContain('primary-base')
    expect(element.className).not.toContain('partner-loud')

    setRecipe('emphasis')

    expect(element.className).toContain('partner-loud')
    expect(element.className).toContain('primary-base')
    expect(element.className).not.toContain('partner-quiet')
  })

  it('compose: reactively forwards partner-only variants when allProps is enabled', () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: {
        base: 'partner-base',
        variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
      },
    })
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: Surface, allProps: true },
      styling: { base: 'primary-base' },
    })
    const [tone, setTone] = createSignal<'quiet' | 'loud'>('quiet')
    const { container } = solidRender(() => (
      // `tone` is intentionally defined only by Surface, so use a spread to exercise runtime
      // forwarding without widening Card's public variant contract.
      <Card
        {...({
          get tone() {
            return tone()
          },
        } as AnyRecord)}
      />
    ))

    const element = container.querySelector('div')!
    expect(element.className).toContain('partner-quiet')
    expect(element.className).toContain('primary-base')

    setTone('loud')

    // A styling-only change updates the mounted element in place; it is not replaced.
    expect(container.querySelector('div')).toBe(element)
    expect(element.isConnected).toBe(true)
    expect(element.className).toContain('partner-loud')
    expect(element.className).toContain('primary-base')
    expect(element.className).not.toContain('partner-quiet')
  })

  it('compose: an explicit asChild from the consumer uses only primary styling', () => {
    const BoxA = createContractComponent({
      tag: 'div',
      styling: {
        base: 'partner-base',
        variants: { intent: { ghost: 'partner-intent-ghost' } },
        presets: { emphasis: { intent: 'ghost' } },
      },
    })
    const BoxB = createContractComponent({
      tag: 'button',
      compose: { with: BoxA, defaults: { intent: 'ghost' } },
      styling: {
        base: 'primary-base',
        variants: { size: { lg: 'primary-size-lg' } },
        presets: { emphasis: { size: 'lg' } },
      },
    })

    const { container } = solidRender(() => (
      <BoxB asChild {...({ recipe: 'emphasis' } as AnyRecord)}>
        {(props: AnyRecord) => <a {...props} />}
      </BoxB>
    ))

    const el = container.querySelector('a')!
    expect(el.className).toContain('primary-base')
    expect(el.className).toContain('primary-size-lg')
    expect(el.className).not.toContain('partner-base')
    expect(el.className).not.toContain('partner-intent-ghost')
    expect(container.querySelector('button')).toBeNull()
  })

  it('asChild throws when as and asChild are both set (strict: throw default)', () => {
    const Comp = createContractComponent({ tag: 'div' })
    expect(() =>
      solidRender(() => (
        // @ts-expect-error — intentionally invalid: as + asChild together
        <Comp as="section" asChild>
          {(props: AnyRecord) => <a {...props} />}
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

  // The two cases above pin the strict:'throw' default. `strict:'warn'` reports instead of
  // throwing (see InvariantBase.violate + warnDiagnostics' throwThreshold), so a malformed
  // asChild usage doesn't unwind the render — it falls through to the ordinary DOM-tag path,
  // as if asChild (and, in the exclusivity case, as) had never been set. Locking that fallback
  // down explicitly, not just "doesn't throw": see tryRenderAsChild's comment in render.tsx.
  it('asChild + non-function children in warn mode: warns and falls back to the ordinary render, not null', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Comp = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: warnDiagnostics },
    })
    const { container } = solidRender(() => (
      // @ts-expect-error — intentionally invalid: children must be a render fn
      <Comp asChild>not a function</Comp>
    ))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('asChild requires a render function'))
    // Falls through to the normal render: the default tag, with the malformed `children` value
    // passed through as ordinary content — not blank, not the render-fn call.
    expect(container.querySelector('div')?.textContent).toBe('not a function')
    warn.mockRestore()
  })

  it('asChild + as both set in warn mode: warns and falls back to the ordinary render using `as`', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Comp = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: warnDiagnostics },
    })
    const { container } = solidRender(() => (
      // @ts-expect-error — intentionally invalid: as + asChild together
      <Comp as="section" asChild>
        {(props: AnyRecord) => <a {...props} />}
      </Comp>
    ))
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"as" and "asChild" are mutually exclusive'),
    )
    // Falls through to the normal render at the `as`-resolved tag (section, not div) — asChild's
    // own render path never runs. (The render-fn `children` value still gets invoked with no
    // arguments here, but that's Solid's own "a function in child position is a reactive
    // accessor" convention, not anything this adapter does on this fallback path.)
    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
    warn.mockRestore()
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
