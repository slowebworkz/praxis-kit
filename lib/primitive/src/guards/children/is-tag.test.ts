import { describe, it, expect } from 'vitest'
import { COMPONENT_DEFAULT_TAG } from './component-id'
import { getTag, isFlowContent, isTag } from './is-tag'
import type { ChildRuleInput } from '../../types/contracts'

function nativeVnode(tag: string, props: Record<string, unknown> = {}) {
  return { type: tag, props }
}

function componentVnode(defaultTag: string, props: Record<string, unknown> = {}) {
  function Component() {}
  Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: defaultTag })
  return { type: Component, props }
}

// ── getTag ────────────────────────────────────────────────────────────────────

describe('getTag', () => {
  describe('native elements', () => {
    it('returns the type string', () => {
      expect(getTag(nativeVnode('source'))).toBe('source')
    })

    it('returns undefined for non-vnodes', () => {
      expect(getTag(null)).toBeUndefined()
      expect(getTag('string')).toBeUndefined()
      expect(getTag(42)).toBeUndefined()
    })

    it('handles missing props', () => {
      expect(getTag({ type: 'img' })).toBe('img')
    })

    it('returns undefined when type is an object (not a string or function)', () => {
      expect(getTag({ type: {} })).toBeUndefined()
    })
  })

  describe('praxis-kit component children (function type)', () => {
    it('returns the default tag', () => {
      expect(getTag(componentVnode('source'))).toBe('source')
    })

    it('returns the "as" prop value when present', () => {
      expect(getTag(componentVnode('source', { as: 'img' }))).toBe('img')
    })

    it('ignores a non-string "as" prop', () => {
      expect(getTag(componentVnode('source', { as: 42 }))).toBe('source')
    })

    it('ignores an empty string "as" prop', () => {
      expect(getTag(componentVnode('source', { as: '' }))).toBe('source')
    })

    it('handles missing props', () => {
      function Component() {}
      Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: 'img' })
      expect(getTag({ type: Component })).toBe('img')
    })

    it('returns undefined for a function with no COMPONENT_DEFAULT_TAG', () => {
      expect(getTag({ type: function NotTagged() {}, props: {} })).toBeUndefined()
    })

    it('resolves COMPONENT_DEFAULT_TAG from the prototype chain', () => {
      function Base() {}
      Object.assign(Base, { [COMPONENT_DEFAULT_TAG]: 'source' })
      function Child() {}
      Object.setPrototypeOf(Child, Base)
      expect(getTag({ type: Child, props: {} })).toBe('source')
    })
  })

  describe('Symbol.for identity regression', () => {
    it('reads COMPONENT_DEFAULT_TAG stamped with another Symbol.for call', () => {
      const duplicateSymbol = Symbol.for('praxis.component-default-tag')
      function Component() {}
      Object.assign(Component, { [duplicateSymbol]: 'source' })
      expect(getTag({ type: Component, props: {} })).toBe('source')
    })
  })

  describe('memo / forwardRef (current limitations)', () => {
    it('returns undefined for a memo-style wrapper object (not currently unwrapped)', () => {
      function Inner() {}
      Object.assign(Inner, { [COMPONENT_DEFAULT_TAG]: 'img' })
      // Simulates React.memo shape: { $$typeof, type: Inner }
      const memoWrapper = { $$typeof: Symbol('react.memo'), type: Inner }
      expect(getTag({ type: memoWrapper, props: {} })).toBeUndefined()
    })
  })
})

// ── isTag ─────────────────────────────────────────────────────────────────────

describe('isTag', () => {
  describe('curried form', () => {
    it('matches when the element type string is in the set', () => {
      expect(isTag('source')(nativeVnode('source'))).toBe(true)
    })

    it('does not match when the element type string is absent from the set', () => {
      expect(isTag('img')(nativeVnode('source'))).toBe(false)
    })

    it('matches one of several tags', () => {
      expect(isTag('source', 'img')(nativeVnode('img'))).toBe(true)
    })

    it('does not match when none of several tags are present', () => {
      expect(isTag('source', 'img')(nativeVnode('video'))).toBe(false)
    })

    it('matches a function component whose default tag is in the set', () => {
      expect(isTag('source')(componentVnode('source'))).toBe(true)
    })

    it('does not match a function component whose default tag is absent from the set', () => {
      expect(isTag('img')(componentVnode('source'))).toBe(false)
    })

    it('resolves the "as" prop override', () => {
      const vnode = componentVnode('source', { as: 'img' })
      expect(isTag('img')(vnode)).toBe(true)
      expect(isTag('source')(vnode)).toBe(false)
    })

    it('ignores a non-string "as" prop', () => {
      expect(isTag('source')(componentVnode('source', { as: 42 }))).toBe(true)
    })

    it('returns false for a function with no COMPONENT_DEFAULT_TAG', () => {
      expect(isTag('source')({ type: function NotTagged() {}, props: {} })).toBe(false)
    })
  })

  describe('direct form', () => {
    it('matches when the element type string is in the set', () => {
      expect(isTag(nativeVnode('img'), 'img')).toBe(true)
    })

    it('does not match when the element type string is absent from the set', () => {
      expect(isTag(nativeVnode('source'), 'img')).toBe(false)
    })

    it('matches one of several tags', () => {
      expect(isTag(nativeVnode('img'), 'source', 'img')).toBe(true)
    })

    it('does not match when none of several tags are present', () => {
      expect(isTag(nativeVnode('video'), 'source', 'img')).toBe(false)
    })

    it('matches a function component', () => {
      expect(isTag(componentVnode('img'), 'img')).toBe(true)
    })

    it('resolves the "as" prop override', () => {
      expect(isTag(componentVnode('source', { as: 'img' }), 'img')).toBe(true)
    })
  })

  describe('direct / curried parity', () => {
    it('behaves identically for a native element', () => {
      const vnode = nativeVnode('img')
      expect(isTag('img')(vnode)).toBe(isTag(vnode, 'img'))
    })

    it('behaves identically for a component with "as" override', () => {
      const vnode = componentVnode('source', { as: 'img' })
      expect(isTag('img')(vnode)).toBe(isTag(vnode, 'img'))
    })
  })

  describe('Symbol.for identity regression', () => {
    it('matches when COMPONENT_DEFAULT_TAG was stamped using a second Symbol.for call', () => {
      const duplicateSymbol = Symbol.for('praxis.component-default-tag')
      function Component() {}
      Object.assign(Component, { [duplicateSymbol]: 'source' })
      expect(isTag('source')({ type: Component, props: {} })).toBe(true)
    })
  })
})

// ── isFlowContent ────────────────────────────────────────────────────────────

describe('isFlowContent', () => {
  it('accepts text nodes (string/number) regardless of blocked tags', () => {
    const flow = isFlowContent('script', 'style')
    expect(flow('hello')).toBe(true)
    expect(flow(42)).toBe(true)
  })

  it('accepts a native element whose tag is not blocked', () => {
    const flow = isFlowContent('script', 'style')
    expect(flow(nativeVnode('div'))).toBe(true)
  })

  it('rejects a native element whose tag is blocked', () => {
    const flow = isFlowContent('script', 'style')
    expect(flow(nativeVnode('script'))).toBe(false)
  })

  it('resolves a praxis-kit component via its default tag', () => {
    const flow = isFlowContent('script')
    expect(flow(componentVnode('style'))).toBe(true)
    expect(flow(componentVnode('script'))).toBe(false)
  })

  it('resolves a praxis-kit component via its "as" override', () => {
    const flow = isFlowContent('script')
    expect(flow(componentVnode('div', { as: 'script' }))).toBe(false)
  })

  it('accepts a child with no resolvable tag (e.g. null)', () => {
    const flow = isFlowContent('script')
    expect(flow(null)).toBe(true)
  })

  // Regression: isFlowContent used to return a plain boolean predicate, which does not satisfy
  // ChildRuleMatch's `(child: T) => child is U` type-predicate requirement — passing it directly
  // as a ChildRuleInput.match failed to typecheck. Compiling this rule at all is the assertion.
  it('satisfies ChildRuleInput.match without a wrapper', () => {
    const rule: ChildRuleInput = {
      name: 'flow-only',
      match: isFlowContent('script', 'style'),
    }
    expect(rule.match('text')).toBe(true)
  })
})
