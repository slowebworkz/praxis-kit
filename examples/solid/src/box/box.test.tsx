import { describe, it, expect } from 'vitest'
import { render } from '@solidjs/testing-library'
import { Box } from './box'

// Solid JSX requires capitalized identifiers for component elements.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BoxC: any = Box

describe('Box — rendering', () => {
  it('renders a <div>', () => {
    const { container } = render(() => <BoxC />)
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('applies flex direction variant', () => {
    const { container } = render(() => <BoxC flex direction="row" />)
    expect(container.querySelector('div')!.className).toContain('flex-row')
  })

  it('applies grid cols variant', () => {
    const { container } = render(() => <BoxC grid cols="2" />)
    expect(container.querySelector('div')!.className).toContain('grid-cols-2')
  })

  it('applies row preset with flex mode', () => {
    const { container } = render(() => <BoxC recipe="row" flex />)
    const cls = container.querySelector('div')!.className
    expect(cls).toContain('flex-row')
    expect(cls).toContain('items-center')
  })
})
