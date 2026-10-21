import { describe, expect, it, vi } from 'vitest'

import { createObservable } from './create-observable'

describe('createObservable', () => {
  it('get() returns the initial value', () => {
    const observable = createObservable(1)
    expect(observable.get()).toBe(1)
  })

  it('set() updates the value read by get()', () => {
    const observable = createObservable(1)
    observable.set(2)
    expect(observable.get()).toBe(2)
  })

  it('set() notifies subscribers on a changed value', () => {
    const observable = createObservable(1)
    const listener = vi.fn()
    observable.subscribe(listener)
    observable.set(2)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('set() does not notify when the value is Object.is-equal to the current one', () => {
    const observable = createObservable(1)
    const listener = vi.fn()
    observable.subscribe(listener)
    observable.set(1)
    expect(listener).not.toHaveBeenCalled()
  })

  it('subscribe() returns an unsubscribe function that stops future notifications', () => {
    const observable = createObservable(1)
    const listener = vi.fn()
    const unsubscribe = observable.subscribe(listener)
    unsubscribe()
    observable.set(2)
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies every subscriber, in registration order', () => {
    const observable = createObservable(1)
    const calls: string[] = []
    observable.subscribe(() => calls.push('a'))
    observable.subscribe(() => calls.push('b'))
    observable.set(2)
    expect(calls).toEqual(['a', 'b'])
  })

  it('a listener unsubscribing another during notification skips the removed one', () => {
    const observable = createObservable(1)
    const b = vi.fn()
    let unsubscribeB = () => {}
    observable.subscribe(() => unsubscribeB())
    unsubscribeB = observable.subscribe(b)
    observable.set(2)
    expect(b).not.toHaveBeenCalled()
  })

  it('a listener subscribed during notification IS called in the same flush (Set.forEach semantics)', () => {
    const observable = createObservable(1)
    const late = vi.fn()
    observable.subscribe(() => observable.subscribe(late))
    observable.set(2)
    expect(late).toHaveBeenCalledTimes(1)
  })

  it('a throwing listener propagates and stops later listeners (known limitation — no per-listener isolation)', () => {
    const observable = createObservable(1)
    const after = vi.fn()
    observable.subscribe(() => {
      throw new Error('boom')
    })
    observable.subscribe(after)
    expect(() => observable.set(2)).toThrow('boom')
    expect(after).not.toHaveBeenCalled()
    expect(observable.get()).toBe(2) // value was already committed before notifying
  })
})
