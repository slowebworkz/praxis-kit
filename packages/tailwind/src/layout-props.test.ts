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
import type { LayoutProps } from './create-tailwind-pipeline'

// ─── Valid usages ─────────────────────────────────────────────────────────────

describe('LayoutProps — valid usages', () => {
  it('accepts flex: true alone', () => {
    const _props: LayoutProps = { flex: true }
    void _props
  })

  it('accepts grid: true alone', () => {
    const _props: LayoutProps = { grid: true }
    void _props
  })

  it('accepts an empty object (no layout mode)', () => {
    const _props: LayoutProps = {}
    void _props
  })
})

// ─── Rejected usages ─────────────────────────────────────────────────────────

describe('LayoutProps — rejected usages', () => {
  it('rejects flex: true and grid: true simultaneously', () => {
    // @ts-expect-error — flex and grid are mutually exclusive
    const _props: LayoutProps = { flex: true, grid: true }
    void _props
  })

  it('rejects flex: false (only true or absent is valid)', () => {
    // @ts-expect-error — false is not assignable to the LayoutProps union
    const _props: LayoutProps = { flex: false }
    void _props
  })

  it('rejects grid: false (only true or absent is valid)', () => {
    // @ts-expect-error — false is not assignable to the LayoutProps union
    const _props: LayoutProps = { grid: false }
    void _props
  })
})
