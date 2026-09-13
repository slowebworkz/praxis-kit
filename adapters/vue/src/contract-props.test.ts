/**
 * Compile-time type contract tests for `ContractProps<T>` — new since Phase 4's decision to unify
 * Vue onto `ContractProps<typeof Component>` (matching every other adapter and this repo's own,
 * previously-inaccurate, README description) instead of the bare `ContractProps<G>` form this
 * adapter used before. No runtime assertions are made. These tests exist to catch type
 * regressions.
 */
import { describe, it, expectTypeOf } from 'vitest'
import { createContractComponent } from './create-contract-component'
import type { ContractProps } from './types'

describe('ContractProps — takes the component value, not bare generics', () => {
  it("is the union of both render modes, same as the component's own $props", () => {
    const Container = createContractComponent({ tag: 'div', name: 'Container' })
    void Container

    type Recovered = ContractProps<typeof Container>
    type Expected = InstanceType<typeof Container>['$props']

    expectTypeOf<Recovered>().toEqualTypeOf<Expected>()
  })

  it('resolves the exact contract for a component with real variants', () => {
    const Button = createContractComponent({
      tag: 'button',
      name: 'Button',
      styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
    })
    void Button

    type Recovered = ContractProps<typeof Button>
    // A real variant prop should be part of the recovered contract.
    expectTypeOf<Recovered>().toHaveProperty('size')
  })

  it('accepts asChild — a plain "just G" extraction still would, this only confirms the rewire kept it', () => {
    const Container = createContractComponent({ tag: 'div', name: 'Container' })
    void Container
    type Recovered = ContractProps<typeof Container>

    const _withAsChild: Recovered = { asChild: true }
    void _withAsChild
    const _withoutAsChild: Recovered = { asChild: false }
    void _withoutAsChild
  })
})
