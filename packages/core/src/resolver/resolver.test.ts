import { describe, expect, it, vi } from 'vitest'
import { createResolverPipeline, enforceAllowedAs } from './resolver'
import { throwDiagnostics, warnDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'
import type { ClassPipelineFn, ResolverOptions } from '../types'

describe('enforceAllowedAs()', () => {
  it('does nothing when tag is in allowedAs', () => {
    expect(() => enforceAllowedAs('section', ['article', 'section'], warnDiagnostics)).not.toThrow()
  })

  it('does nothing when diagnostics is undefined', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    enforceAllowedAs('div', ['article', 'section'], undefined)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('does nothing when diagnostics is silentDiagnostics', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    enforceAllowedAs('div', ['article', 'section'], silentDiagnostics)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('reports to console.warn when warnDiagnostics and tag not allowed', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    enforceAllowedAs('div', ['article', 'section'], warnDiagnostics)
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0]![0]).toContain('"div"')
    expect(spy.mock.calls[0]![0]).toContain('"article"')
    spy.mockRestore()
  })

  it('throws when throwDiagnostics and tag not allowed', () => {
    expect(() => enforceAllowedAs('div', ['article', 'section'], throwDiagnostics)).toThrow(/"div"/)
  })

  it('includes displayName in message when provided', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    enforceAllowedAs('div', ['article'], warnDiagnostics, 'Heading')
    expect(spy.mock.calls[0]![0]).toContain('<Heading>')
    spy.mockRestore()
  })
})

describe('createResolverPipeline()', () => {
  // Echoes the tag + a marker so tests can assert the pipeline forwarded the engine's props.
  const classPipeline: ClassPipelineFn = (tag, props) =>
    `${String(tag)}${'role' in props ? ' has-role' : ''}`

  const opts = (over: Partial<ResolverOptions> = {}): ResolverOptions => ({
    defaultTag: 'button',
    diagnostics: silentDiagnostics,
    ...over,
  })

  it('resolves the default tag and passes it through to output + class pipeline', () => {
    const resolve = createResolverPipeline(opts(), classPipeline)
    const out = resolve({ props: {} })
    expect(out.tag).toBe('button')
    expect(out.className).toBe('button')
  })

  it('honors an `as` override', () => {
    const resolve = createResolverPipeline(opts(), classPipeline)
    expect(resolve({ props: {}, as: 'a' }).tag).toBe('a')
  })

  it('merges defaultProps under caller props', () => {
    const resolve = createResolverPipeline(opts({ defaultProps: { type: 'submit', id: 'x' } }), classPipeline)
    const out = resolve({ props: { id: 'y' } })
    expect(out.props).toMatchObject({ type: 'submit', id: 'y' })
  })

  it('runs the built-in ARIA policy — a redundant explicit role is stripped before styling', () => {
    const resolve = createResolverPipeline(opts(), classPipeline)
    // <button role="button"> — the implicit role restated; the engine's redundant-role fix removes it.
    const out = resolve({ props: { role: 'button' } })
    expect(out.props).not.toHaveProperty('role')
    expect(out.className).toBe('button')
  })

  it('enforces allowedAs against an explicit `as`, not the default tag', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const resolve = createResolverPipeline(
      opts({ defaultTag: 'div', allowedAs: ['article', 'section'], diagnostics: warnDiagnostics }),
      classPipeline,
    )
    resolve({ props: {} }) // default tag 'div' not in allowedAs — no complaint
    expect(spy).not.toHaveBeenCalled()
    resolve({ props: {}, as: 'span' }) // explicit override outside the set — flagged
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it('forwards children only when supplied', () => {
    const resolve = createResolverPipeline(opts(), classPipeline)
    expect(resolve({ props: {} })).not.toHaveProperty('children')
    expect(resolve({ props: {}, children: ['x'] }).children).toEqual(['x'])
  })
})
