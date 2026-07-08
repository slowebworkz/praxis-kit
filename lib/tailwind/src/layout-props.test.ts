/**
 * Compile-time type contract tests for LayoutProps.
 *
 * Each test either:
 *   (a) contains an assignment that must compile without error, or
 *   (b) uses @ts-expect-error to assert that a specific value is rejected.
 *
 * A @ts-expect-error directive with no actual error underneath causes a
 * TypeScript compile failure — so negative tests are self-policing.
 *
 * No runtime assertions are made. These tests exist to catch type regressions.
 */
import { describe, it } from 'vitest'
import type { layoutKeys } from './layout-keys'
import type { LayoutProps } from './types/layout'

type Props = LayoutProps<typeof layoutKeys>

// ─── Valid usages ─────────────────────────────────────────────────────────────

describe('LayoutProps — valid usages', () => {
  it('accepts flex: true alone', () => {
    const _props: Props = { flex: true }
    void _props
  })

  it('accepts inline-flex: true alone', () => {
    const _props: Props = { 'inline-flex': true }
    void _props
  })

  it('accepts grid: true alone', () => {
    const _props: Props = { grid: true }
    void _props
  })

  it('accepts inline-grid: true alone', () => {
    const _props: Props = { 'inline-grid': true }
    void _props
  })

  it('accepts block: true alone', () => {
    const _props: Props = { block: true }
    void _props
  })

  it('accepts hidden: true alone', () => {
    const _props: Props = { hidden: true }
    void _props
  })

  it('accepts contents: true alone', () => {
    const _props: Props = { contents: true }
    void _props
  })

  it('accepts an empty object (no display mode)', () => {
    const _props: Props = {}
    void _props
  })
})

// ─── Rejected usages ─────────────────────────────────────────────────────────

describe('LayoutProps — rejected usages', () => {
  it('rejects flex: true and grid: true simultaneously', () => {
    // @ts-expect-error — flex and grid are mutually exclusive
    const _props: Props = { flex: true, grid: true }
    void _props
  })

  it('rejects flex: true and block: true simultaneously', () => {
    // @ts-expect-error — all display props are mutually exclusive
    const _props: Props = { flex: true, block: true }
    void _props
  })

  it('rejects block: true and hidden: true simultaneously', () => {
    // @ts-expect-error — all display props are mutually exclusive
    const _props: Props = { block: true, hidden: true }
    void _props
  })

  it('rejects flex: false (only true or absent is valid)', () => {
    // @ts-expect-error — false is not assignable to the LayoutProps union
    const _props: Props = { flex: false }
    void _props
  })

  it('rejects grid: false (only true or absent is valid)', () => {
    // @ts-expect-error — false is not assignable to the LayoutProps union
    const _props: Props = { grid: false }
    void _props
  })

  it('rejects block: false (only true or absent is valid)', () => {
    // @ts-expect-error — false is not assignable to the LayoutProps union
    const _props: Props = { block: false }
    void _props
  })
})
