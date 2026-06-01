import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@solidjs/testing-library'
import { Button } from './button'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ButtonC: any = Button

describe('Button — rendering', () => {
  it('renders a <button>', () => {
    const { container } = render(() => <ButtonC />)
    expect(container.querySelector('button')).toBeTruthy()
  })

  it('applies base class', () => {
    const { container } = render(() => <ButtonC />)
    expect(container.querySelector('button')!.className).toContain('inline-flex')
  })

  it('applies default variant classes', () => {
    const { container } = render(() => <ButtonC />)
    const cls = container.querySelector('button')!.className
    expect(cls).toContain('bg-gray-100')
    expect(cls).toContain('px-4')
  })
})

describe('Button — variants', () => {
  it('applies primary intent', () => {
    const { container } = render(() => <ButtonC intent="primary" />)
    expect(container.querySelector('button')!.className).toContain('bg-blue-600')
  })

  it('applies sm size', () => {
    const { container } = render(() => <ButtonC size="sm" />)
    expect(container.querySelector('button')!.className).toContain('px-2')
  })

  it('cta preset applies primary + lg', () => {
    const { container } = render(() => <ButtonC variantKey="cta" />)
    const cls = container.querySelector('button')!.className
    expect(cls).toContain('bg-blue-600')
    expect(cls).toContain('px-6')
  })
})

describe('Button — filterProps', () => {
  it('does not set intent as a DOM attribute', () => {
    const { container } = render(() => <ButtonC intent="primary" />)
    expect(container.querySelector('button')!.hasAttribute('intent')).toBe(false)
  })

  it('forwards standard HTML attributes', () => {
    const { container } = render(() => <ButtonC disabled />)
    expect((container.querySelector('button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('fires onClick', () => {
    let clicked = false
    const { container } = render(() => (
      <ButtonC
        onClick={() => {
          clicked = true
        }}
      />
    ))
    fireEvent.click(container.querySelector('button')!)
    expect(clicked).toBe(true)
  })
})
