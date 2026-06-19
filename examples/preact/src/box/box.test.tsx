import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { Box } from './box'

afterEach(cleanup)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = (c: unknown): any => c

describe('Box — rendering', () => {
  it('renders a <div>', () => {
    const { container } = render(h(C(Box), null))
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('applies flex variant class', () => {
    const { container } = render(h(C(Box), { flex: true, direction: 'row' }))
    expect(container.querySelector('div')!.className).toContain('flex-row')
  })

  it('applies grid variant class', () => {
    const { container } = render(h(C(Box), { grid: true, cols: '2' }))
    expect(container.querySelector('div')!.className).toContain('grid-cols-2')
  })

  it('applies row preset with flex mode', () => {
    const { container } = render(h(C(Box), { recipe: 'row', flex: true }))
    const cls = container.querySelector('div')!.className
    expect(cls).toContain('flex-row')
    expect(cls).toContain('items-center')
  })
})
