/**
 * Compile-time type contract tests for createContractComponent.
 *
 * Each test either:
 *   (a) contains JSX/code that must compile without error, or
 *   (b) uses @ts-expect-error to assert that a specific usage is rejected.
 *
 * A @ts-expect-error directive with no actual error underneath causes a
 * TypeScript compile failure — so negative tests are self-policing.
 *
 * No runtime assertions are made. These tests exist to catch type regressions.
 */
import { describe, it } from 'vitest'
import { createRef } from 'react'
import type { MouseEvent } from 'react'
import { createContractComponent } from './create-contract-component'
import { Slottable } from '@praxis-kit/react/shared'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type { PolymorphicProps } from '@praxis-kit/react/shared'

const Button = createContractComponent<'button', EmptyRecord, EmptyRecord>({ name: 'Button' })
const Anchor = createContractComponent<'a', EmptyRecord, EmptyRecord>({ name: 'Anchor' })

// ─── as prop: intrinsic attribute narrowing ───────────────────────────────────

describe('as prop — intrinsic attribute narrowing', () => {
  it('accepts href when as="a"', () => {
    const _el = <Button as="a" href="/" />
    void _el
  })

  it('rejects href on the default button element', () => {
    // JSX does not enforce excess property checking for generic call-signature components,
    // so this assertion uses a direct prop-type assignment instead.
    // @ts-expect-error — href is not a button attribute
    const _props: PolymorphicProps<PolymorphicGenerics<'button', E, E>> = { href: '/' }
    void _props
  })

  it('accepts type="submit" on the default button element', () => {
    const _el = <Button type="submit" />
    void _el
  })

  it('rejects disabled when as="a" (button-only attribute)', () => {
    // JSX does not enforce excess property checking for generic call-signature components.
    // @ts-expect-error — disabled is not an anchor attribute
    const _props: PolymorphicProps<PolymorphicGenerics<'button', E, E>, 'a'> = { disabled: true }
    void _props
  })

  it('accepts download when as="a" (anchor-only attribute)', () => {
    const _el = <Button as="a" download />
    void _el
  })

  it('accepts disabled when as="button" (button-only attribute)', () => {
    const _el = <Button disabled />
    void _el
  })
})

// ─── as prop: ref narrowing ───────────────────────────────────────────────────

describe('as prop — ref narrowing', () => {
  it('accepts Ref<HTMLButtonElement> on default element', () => {
    const ref = createRef<HTMLButtonElement>()
    const _el = <Button ref={ref} />
    void _el
  })

  it('rejects Ref<HTMLAnchorElement> on default button element', () => {
    const ref = createRef<HTMLAnchorElement>()
    // @ts-expect-error — HTMLAnchorElement ref is not assignable to HTMLButtonElement ref
    const _el = <Button ref={ref} />
    void _el
  })

  it('accepts Ref<HTMLAnchorElement> when as="a"', () => {
    const ref = createRef<HTMLAnchorElement>()
    const _el = <Button as="a" ref={ref} />
    void _el
  })

  it('rejects Ref<HTMLButtonElement> when as="a"', () => {
    const ref = createRef<HTMLButtonElement>()
    // @ts-expect-error — HTMLButtonElement ref is not assignable to HTMLAnchorElement ref
    const _el = <Button as="a" ref={ref} />
    void _el
  })

  it('anchor component default ref is HTMLAnchorElement', () => {
    const ref = createRef<HTMLAnchorElement>()
    const _el = <Anchor ref={ref} />
    void _el
  })
})

// ─── as prop: event handler narrowing ────────────────────────────────────────

describe('as prop — event handler narrowing', () => {
  it('onClick receives HTMLButtonElement event on default element', () => {
    const handler = (_e: MouseEvent<HTMLButtonElement>) => {}
    const _el = <Button onClick={handler} />
    void _el
  })

  it('onClick receives HTMLAnchorElement event when as="a"', () => {
    const handler = (_e: MouseEvent<HTMLAnchorElement>) => {}
    const _el = <Button as="a" onClick={handler} />
    void _el
  })

  it('rejects anchor event handler on default button element', () => {
    const handler = (_e: MouseEvent<HTMLAnchorElement>) => {}
    // @ts-expect-error — anchor mouse event is not assignable to button mouse event handler
    const _el = <Button onClick={handler} />
    void _el
  })
})

// ─── asChild — static type contract ──────────────────────────────────────────

describe('asChild — static type contract', () => {
  it('accepts asChild with a ReactElement child', () => {
    const _el = (
      <Button asChild>
        <a href="/" />
      </Button>
    )
    void _el
  })

  it('rejects asChild without children', () => {
    // @ts-expect-error — asChild: true requires at least one ReactElement child
    const _el = <Button asChild />
    void _el
  })

  it('accepts as when asChild is absent', () => {
    const _el = <Button as="a" href="/" />
    void _el
  })

  it('rejects as when asChild is true', () => {
    const _el = (
      // @ts-expect-error — as and asChild are mutually exclusive; as is forbidden on the slot path
      <Button asChild as="a">
        <a href="/" />
      </Button>
    )
    void _el
  })

  it('static limitation — ref is typed against TDefault, not the runtime child element', () => {
    // asChild does not change TAs. TypeScript types ref against TDefault (HTMLButtonElement)
    // regardless of the runtime child element. Runtime merges onto the actual child; statically
    // there is no generic parameter carrying the child element type.
    const ref = createRef<HTMLButtonElement>()
    const _el = (
      <Button asChild ref={ref}>
        <a href="/" />
      </Button>
    )
    void _el
  })
})

// ─── Slottable — type contract ────────────────────────────────────────────────

describe('Slottable — type contract', () => {
  it('can be composed as a sibling in asChild children', () => {
    const _el = (
      <Button asChild>
        <span />
        <Slottable>
          <a href="/" />
        </Slottable>
      </Button>
    )
    void _el
  })

  it('Slottable wrapping an anchor element compiles', () => {
    const _el = (
      <Slottable>
        <a href="/" />
      </Slottable>
    )
    void _el
  })

  it('Slottable accepts any ReactNode as children', () => {
    const _el = <Slottable>{'text'}</Slottable>
    void _el
  })
})
