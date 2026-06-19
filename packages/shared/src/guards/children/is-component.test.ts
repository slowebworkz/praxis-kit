import { describe, it, expect } from 'vitest'
import { COMPONENT_ID, createComponentId } from './component-id'
import { getComponentId, hasComponentId, isComponent } from './is-component'

const IMAGE_ID = createComponentId('Image')
const ICON_ID = createComponentId('Icon')

function componentVnode(id: symbol) {
  function Component() {}
  Object.assign(Component, { [COMPONENT_ID]: id })
  return { type: Component }
}

// ── getComponentId ────────────────────────────────────────────────────────────

describe('getComponentId', () => {
  it('returns the symbol stamped on the component type', () => {
    expect(getComponentId(componentVnode(IMAGE_ID))).toBe(IMAGE_ID)
  })

  it('returns undefined for a native element vnode', () => {
    expect(getComponentId({ type: 'img' })).toBeUndefined()
  })

  it('returns undefined for a function with no COMPONENT_ID', () => {
    expect(getComponentId({ type: function Plain() {} })).toBeUndefined()
  })

  it('returns undefined for non-vnode values', () => {
    expect(getComponentId(null)).toBeUndefined()
    expect(getComponentId('string')).toBeUndefined()
    expect(getComponentId(42)).toBeUndefined()
  })
})

// ── hasComponentId ────────────────────────────────────────────────────────────

describe('hasComponentId', () => {
  it('returns true for any praxis-kit component vnode', () => {
    expect(hasComponentId(componentVnode(IMAGE_ID))).toBe(true)
  })

  it('returns false for a native element vnode', () => {
    expect(hasComponentId({ type: 'img' })).toBe(false)
  })

  it('returns false for a plain function with no COMPONENT_ID', () => {
    expect(hasComponentId({ type: function Plain() {} })).toBe(false)
  })

  it('returns false for non-vnode values', () => {
    expect(hasComponentId(null)).toBe(false)
    expect(hasComponentId(undefined)).toBe(false)
  })
})

// ── isComponent ───────────────────────────────────────────────────────────────

describe('isComponent', () => {
  describe('curried form', () => {
    it('matches a component by name string', () => {
      expect(isComponent('Image')(componentVnode(IMAGE_ID))).toBe(true)
    })

    it('does not match a component with a different name', () => {
      expect(isComponent('Icon')(componentVnode(IMAGE_ID))).toBe(false)
    })

    it('matches when the symbol is in a multi-id set', () => {
      const check = isComponent('Image', 'Icon')
      expect(check(componentVnode(IMAGE_ID))).toBe(true)
      expect(check(componentVnode(ICON_ID))).toBe(true)
    })

    it('supports mixing names and symbols', () => {
      const check = isComponent(IMAGE_ID, 'Icon')
      expect(check(componentVnode(IMAGE_ID))).toBe(true)
      expect(check(componentVnode(ICON_ID))).toBe(true)
      expect(check(componentVnode(createComponentId('Button')))).toBe(false)
    })

    it('matches by symbol directly', () => {
      expect(isComponent(IMAGE_ID)(componentVnode(IMAGE_ID))).toBe(true)
    })

    it('ignores duplicate ids', () => {
      expect(isComponent('Image', 'Image')(componentVnode(IMAGE_ID))).toBe(true)
    })

    it('does not match a native element', () => {
      expect(isComponent('Image')({ type: 'img' })).toBe(false)
    })

    it('is composable with Array#filter', () => {
      const children = [componentVnode(IMAGE_ID), { type: 'img' }, componentVnode(ICON_ID)]
      expect(children.filter(isComponent('Image'))).toHaveLength(1)
    })
  })

  describe('direct form', () => {
    it('matches a component by name string', () => {
      expect(isComponent(componentVnode(IMAGE_ID), 'Image')).toBe(true)
    })

    it('does not match a component with a different name', () => {
      expect(isComponent(componentVnode(IMAGE_ID), 'Icon')).toBe(false)
    })

    it('matches when the symbol is in a multi-id set', () => {
      expect(isComponent(componentVnode(IMAGE_ID), 'Image', 'Icon')).toBe(true)
      expect(isComponent(componentVnode(ICON_ID), 'Image', 'Icon')).toBe(true)
    })

    it('supports mixing names and symbols', () => {
      expect(isComponent(componentVnode(IMAGE_ID), IMAGE_ID, 'Icon')).toBe(true)
      expect(isComponent(componentVnode(ICON_ID), IMAGE_ID, 'Icon')).toBe(true)
      expect(isComponent(componentVnode(ICON_ID), IMAGE_ID, 'Image')).toBe(false)
    })

    it('matches by symbol directly', () => {
      expect(isComponent(componentVnode(IMAGE_ID), IMAGE_ID)).toBe(true)
    })

    it('ignores duplicate ids', () => {
      expect(isComponent(componentVnode(IMAGE_ID), 'Image', 'Image')).toBe(true)
    })

    it('does not match a native element', () => {
      expect(isComponent({ type: 'img' }, 'Image')).toBe(false)
    })
  })
})
