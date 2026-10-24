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

    it('uses the composing component’s prop value when composed props collide', () => {
      const withBundle = createContractComponent({
        tag: 'button',
        defaults: { 'data-collision': 'with-value' },
      })
      const composingBundle = createContractComponent({
        tag: 'button',
        defaults: { 'data-collision': 'composing-value' },
        compose: { with: withBundle, allProps: true },
      })

      const { container } = render(Polymorphic, { bundle: composingBundle })

      expect(container.querySelector('button')?.getAttribute('data-collision')).toBe(
        'composing-value',
      )
    })

    it('does not recursively render a composed partner’s own composition', () => {
      const leaf = createContractComponent({
        tag: 'a',
        styling: { base: 'leaf-class' },
      })
      const middle = createContractComponent({
        tag: 'span',
        styling: { base: 'middle-class' },
        compose: { with: leaf as never, allProps: true },
      })
      const root = createContractComponent({
        tag: 'button',
        styling: { base: 'root-class' },
        compose: { with: middle as never, allProps: true },
      })

      const { container } = render(Polymorphic, { bundle: root })
      const button = container.querySelector('button')

      expect(button).toBeTruthy()
      expect(button?.className).toContain('root-class')
      expect(button?.className).toContain('middle-class')
      expect(button?.className).not.toContain('leaf-class')
      expect(container.querySelector('a')).toBeNull()
      expect(container.querySelector('span')).toBeNull()
    })

    it('explicit allProps: false still styles the composed bundle from selected variants', () => {
      // `allProps` gates raw prop forwarding only; a variant the Praxis partner declares is
      // selected from the composing component's props whenever `compose.with` exists.
      const boxA = createContractComponent({
        tag: 'div',
        styling: { variants: { intent: { ghost: 'intent-ghost' } } },
      })
      const boxB = createContractComponent({
        tag: 'button',
        compose: { with: boxA, allProps: false },
      })

      const { container } = render(Polymorphic, { bundle: boxB, intent: 'ghost' })

      expect(container.querySelector('button')?.className).toContain('intent-ghost')
    })

    describe('composition styling', () => {
      // Contribution order, primary-over-`compose.defaults` precedence, and unforwarded-prop
      // isolation run through the shared conformance suite (`compositionStyling: true`); the
      // cases below are the ones that suite can't express.

      it('preserves a class supplied through compose.defaults without the partner’s computed classes', () => {
        const surface = createContractComponent({
          tag: 'div',
          styling: {
            base: 'partner-base',
            variants: { intent: { ghost: 'partner-ghost', solid: 'partner-solid' } },
          },
        })
        // @ts-expect-error compose.defaults is variant-only; `class` is rejected by the type but still honored at runtime
        const card = createContractComponent({
          tag: 'div',
          compose: { with: surface, defaults: { class: 'default-class', intent: 'ghost' } },
          styling: {
            base: 'primary-base',
            variants: { intent: { ghost: 'primary-ghost', solid: 'primary-solid' } },
            defaults: { intent: 'solid' },
          },
        })

        const { container } = render(Polymorphic, { bundle: card, class: 'caller-class' })
        const className = container.querySelector('div')!.className

        expect(className).toContain('default-class')
        expect(className).toContain('caller-class')
        expect(className).toContain('partner-solid')
        expect(className).not.toContain('partner-ghost')
        expect(className).not.toContain('primary-ghost')
      })

      it('keeps a partner-only variant from compose.defaults and a primary-only variant functional', () => {
        const surface = createContractComponent({
          tag: 'div',
          styling: { variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } } },
        })
        const card = createContractComponent({
          tag: 'div',
          compose: { with: surface, defaults: { tone: 'loud' } },
          styling: { variants: { size: { sm: 'primary-sm', lg: 'primary-lg' } } },
        })

        const { container } = render(Polymorphic, { bundle: card, size: 'lg' })
        const className = container.querySelector('div')!.className

        expect(className).toContain('partner-loud')
        expect(className).toContain('primary-lg')
        expect(className).not.toContain('partner-quiet')
      })

      it('applies a recipe from the composing component across both contracts', () => {
        const surface = createContractComponent({
          tag: 'div',
          styling: { variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } } },
        })
        const card = createContractComponent({
          tag: 'div',
          compose: { with: surface },
          styling: {
            variants: { tone: { quiet: 'primary-quiet', loud: 'primary-loud' } },
            presets: { emphasis: { tone: 'loud' } },
          },
        })

        const { container } = render(Polymorphic, { bundle: card, recipe: 'emphasis' })
        const className = container.querySelector('div')!.className

        expect(className).toContain('partner-loud')
        expect(className).toContain('primary-loud')
      })

      it('retains a recipe that only the partner defines instead of rejecting it', () => {
        const surface = createContractComponent({
          tag: 'div',
          styling: {
            variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
            presets: { emphasis: { tone: 'loud' } },
          },
        })
        const card = createContractComponent({
          tag: 'div',
          compose: { with: surface },
          styling: { base: 'primary-base' },
        })

        const { container } = render(Polymorphic, { bundle: card, recipe: 'emphasis' })
        const className = container.querySelector('div')!.className

        expect(className).toContain('partner-loud')
        expect(className).toContain('primary-base')
      })

      it('lets the primary win an incompatible shared variant and warns once at construction', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
          const surface = createContractComponent({
            tag: 'div',
            styling: { variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } } },
          })
          const card = createContractComponent({
            tag: 'div',
            compose: { with: surface },
            enforcement: { diagnostics: warnDiagnostics },
            styling: {
              variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } },
              defaults: { tone: 'bold' },
            },
          })
          // Construction-time: the diagnostic fires before any render.
          const constructionWarnings = warnSpy.mock.calls.flat().join(' ')
          expect(constructionWarnings).toContain('Incompatible composed variant "tone"')

          const { container } = render(Polymorphic, { bundle: card })
          const className = container.querySelector('div')!.className
          expect(className).toContain('primary-bold')
          expect(className).not.toContain('partner-')
        } finally {
          warnSpy.mockRestore()
        }
      })

      // The combined path (Praxis partner with retained metadata) and the nested-render fallback
      // (a bundle-shaped target without it — a spread copy drops the non-enumerable metadata) are
      // two implementations that must agree on the REQUIRED PARITY behaviors below: partner and
      // primary base classes, caller class, a `class` from compose.defaults, explicit primary
      // variant values affecting the primary contribution, the composing component's own DOM
      // props, single handler delivery, and explicit asChild precedence.
      //
      // INTENTIONAL DIFFERENCES (combined path only; the fallback has no retained partner metadata):
      //   - A variant the partner declares, whether shared with the primary or partner-only, is
      //     selected from the composing component's props, so the partner's contribution follows
      //     it even with allProps: false. The fallback only reaches the partner through allProps.
      //   - Partner base/variant/compound classes are produced by the shared pipeline in
      //     contribution order, not concatenated from the partner's separately-resolved class.
      // These differences are pinned by their own tests; do not add them to the parity matrix.
      describe.each([
        ['Praxis partner (combined path)', (b: object) => b],
        ['partner without retained metadata (fallback path)', (b: object) => ({ ...b })],
      ])('required path parity — %s', (_label, asPartner) => {
        function build(
          composeExtras: AnyRecord = {},
          primaryStyling: AnyRecord = {},
        ): ReturnType<typeof createContractComponent> {
          const surface = createContractComponent({
            tag: 'div',
            styling: {
              base: 'partner-base',
              variants: {
                intent: { ghost: 'partner-ghost', solid: 'partner-solid' },
                tone: { quiet: 'partner-quiet', loud: 'partner-loud' },
              },
            },
          })
          return createContractComponent({
            tag: 'div',
            compose: { with: asPartner(surface) as never, ...composeExtras },
            styling: {
              base: 'primary-base',
              variants: { intent: { ghost: 'primary-ghost', solid: 'primary-solid' } },
              ...primaryStyling,
            },
          } as never)
        }

        it('keeps partner base, primary base, and the caller class', () => {
          const { container } = render(Polymorphic, { bundle: build(), class: 'caller-class' })
          const className = container.querySelector('div')!.className

          expect(className).toContain('partner-base')
          expect(className).toContain('primary-base')
          expect(className).toContain('caller-class')
        })

        it('keeps a class supplied through compose.defaults alongside the caller class', () => {
          const bundle = build({ defaults: { class: 'default-class' } })
          const { container } = render(Polymorphic, { bundle, class: 'caller-class' })
          const className = container.querySelector('div')!.className

          expect(className).toContain('default-class')
          expect(className).toContain('caller-class')
        })

        it('lets an explicit primary variant value drive the primary contribution', () => {
          const { container } = render(Polymorphic, { bundle: build(), intent: 'solid' })
          const className = container.querySelector('div')!.className

          expect(className).toContain('primary-solid')
          expect(className).not.toContain('primary-ghost')
        })

        it('keeps the composing component’s own DOM props on its element regardless of allProps', () => {
          // Not a forwarding test: the primary's own element always receives its DOM props. The
          // partner-only variant test above is the observable proof of allProps forwarding.
          for (const allProps of [true, false]) {
            const { container } = render(Polymorphic, {
              bundle: build({ allProps }),
              'data-probe': 'yes',
            })
            expect(container.querySelector('div')!.getAttribute('data-probe')).toBe('yes')
            cleanup()
          }
        })

        it.each([true, false])(
          'delivers a handler passed to the composing component exactly once (allProps: %s)',
          (allProps) => {
            const onClick = vi.fn()
            const { container } = render(Polymorphic, { bundle: build({ allProps }), onClick })

            container.querySelector('div')!.dispatchEvent(new Event('click', { bubbles: true }))

            // The composing component owns the handler on its element; allProps may also hand it
            // to the partner, but the partner's slot props never bind a second native listener.
            expect(onClick).toHaveBeenCalledTimes(1)
          },
        )

        it('prefers explicit asChild and resolves only the primary recipe', () => {
          const surface = createContractComponent({
            tag: 'div',
            styling: {
              base: 'partner-base',
              variants: { intent: { ghost: 'partner-intent-ghost' } },
              presets: { emphasis: { intent: 'ghost' } },
            },
          })
          const card = createContractComponent({
            tag: 'div',
            compose: { with: surface, defaults: { intent: 'ghost' } },
            styling: {
              base: 'primary-base',
              variants: { size: { lg: 'primary-size-lg' } },
              presets: { emphasis: { size: 'lg' } },
            },
          })
          let received: AnyRecord = {}
          const children = createRawSnippet<[AnyRecord]>((getProps) => ({
            render() {
              received = getProps()
              return '<a>link</a>'
            },
          }))

          render(Polymorphic, { bundle: card, recipe: 'emphasis', asChild: true, children })

          expect(received['class']).toContain('primary-base')
          expect(received['class']).toContain('primary-size-lg')
          expect(received['class']).not.toContain('partner-base')
          expect(received['class']).not.toContain('partner-intent-ghost')
        })
      })

      it.each([
        [
          'a variant both contracts declare',
          'intent',
          { intent: { ghost: 'primary-ghost', solid: 'primary-solid' } },
        ],
        ['a partner-only variant', 'intent', {}],
      ])('selects %s on the partner without allProps (combined path only)', (_label, name, own) => {
        // Intended difference between the two paths: with a Praxis partner, a variant it declares
        // is selected from the composing component's props even when allProps is off, so the
        // partner's contribution follows it. A partner without retained metadata is only reachable
        // through allProps, so it never sees the value.
        const surface = createContractComponent({
          tag: 'div',
          styling: { variants: { [name]: { ghost: 'partner-ghost', solid: 'partner-solid' } } },
        })
        const card = (partner: object) =>
          createContractComponent({
            tag: 'div',
            compose: { with: partner as never, allProps: false },
            styling: { variants: own },
          } as never)

        const combined = render(Polymorphic, { bundle: card(surface), [name]: 'solid' } as never)
        expect(combined.container.querySelector('div')!.className).toContain('partner-solid')
        cleanup()

        const fallback = render(Polymorphic, {
          bundle: card({ ...surface }),
          [name]: 'solid',
        } as never)
        expect(fallback.container.querySelector('div')!.className).not.toContain('partner-solid')
      })

      it('does not activate from compose.allProps alone, and leaves ordinary rendering unchanged', () => {
        const box = createContractComponent({
          tag: 'div',
          compose: { allProps: true } as never,
          styling: { base: 'primary-base' },
        })

        const { container } = render(Polymorphic, { bundle: box, class: 'caller-class' })

        expect(box.resolveComposedClasses).toBeUndefined()
        expect(container.querySelector('div')?.className).toBe('primary-base caller-class')
      })

      it('keeps the nested-render fallback for a target without retained styling metadata', () => {
        const surface = createContractComponent({ tag: 'div', styling: { base: 'partner-base' } })
        // Spreading drops the non-enumerable metadata property, leaving a bundle-shaped value with
        // no retained Praxis styling contract.
        const external = { ...surface }
        const card = createContractComponent({
          tag: 'div',
          compose: { with: external },
          styling: { base: 'primary-base' },
        })

        const { container } = render(Polymorphic, { bundle: card })
        const className = container.querySelector('div')!.className

        expect(card.resolveComposedClasses).toBeUndefined()
        expect(className).toContain('partner-base')
        expect(className).toContain('primary-base')
      })
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
