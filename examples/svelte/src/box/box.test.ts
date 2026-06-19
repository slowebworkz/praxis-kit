// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import Box from './Box.svelte'

afterEach(cleanup)

describe('Box — rendering', () => {
  it('renders a <div>', () => {
    const { container } = render(Box)
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('applies flex direction variant', () => {
    const { container } = render(Box, { props: { flex: true, direction: 'row' } })
    expect(container.querySelector('div')!.className).toContain('flex-row')
  })

  it('applies grid cols variant', () => {
    const { container } = render(Box, { props: { grid: true, cols: '2' } })
    expect(container.querySelector('div')!.className).toContain('grid-cols-2')
  })

  it('applies row preset with flex mode', () => {
    const { container } = render(Box, { props: { recipe: 'row', flex: true } })
    const cls = container.querySelector('div')!.className
    expect(cls).toContain('flex-row')
    expect(cls).toContain('items-center')
  })
})
