import { describe, it, expect } from 'vitest'
import { createElement, Fragment } from 'react'
import { Slottable } from './Slottable'
import { extractSlottable } from './extractSlottable'
import { div, span } from '../test-utils'

describe('extractSlottable', () => {
  describe('when no Slottable is present', () => {
    it('returns null for a plain element child', () => {
      expect(extractSlottable(div())).toBeNull()
    })

    it('returns null for an array of plain elements', () => {
      expect(extractSlottable([div(), span()])).toBeNull()
    })
  })

  describe('when one valid Slottable is present', () => {
    it('returns the Slottable inner element as child', () => {
      const inner = div({ id: 'target' })
      const slottable = createElement(Slottable, null, inner)
      const result = extractSlottable([span(), slottable])
      expect(result).not.toBeNull()
      expect(result!.child).toBe(inner)
    })

    it('rebuild replaces the Slottable position with the merged element', () => {
      const inner = div()
      const sibling = span({ id: 'sibling' })
      const slottable = createElement(Slottable, null, inner)
      const result = extractSlottable([sibling, slottable])!
      const merged = div({ id: 'merged' })
      const rebuilt = result.rebuild(merged)
      expect(rebuilt.type).toBe(Fragment)
      const children = (rebuilt.props as { children: unknown[] }).children
      expect(children[0]).toBe(sibling)
      expect(children[1]).toBe(merged)
    })
  })

  describe('multiple Slottable children', () => {
    it('throws when more than one Slottable is present', () => {
      const a = createElement(Slottable, null, div())
      const b = createElement(Slottable, null, span())
      expect(() => extractSlottable([a, b])).toThrow(
        'Slot: multiple Slottable children are not allowed',
      )
    })
  })

  describe('invalid Slottable child content', () => {
    it('throws a dedicated error for null child', () => {
      const slottable = createElement(Slottable, null, null)
      expect(() => extractSlottable(slottable)).toThrow(
        'Slottable expects exactly one React element child, received null',
      )
    })

    it('throws a dedicated error for undefined child', () => {
      const slottable = createElement(Slottable, null, undefined)
      expect(() => extractSlottable(slottable)).toThrow(
        'Slottable expects exactly one React element child, received null',
      )
    })

    it('throws a dedicated error for a string child', () => {
      const slottable = createElement(Slottable, null, 'label text')
      expect(() => extractSlottable(slottable)).toThrow(
        'Slottable expects exactly one React element child, received text content',
      )
    })

    it('throws a dedicated error for a number child', () => {
      const slottable = createElement(Slottable, null, 42)
      expect(() => extractSlottable(slottable)).toThrow(
        'Slottable expects exactly one React element child, received text content',
      )
    })

    it('throws for a Fragment child', () => {
      const slottable = createElement(Slottable, null, createElement(Fragment, null, div()))
      expect(() => extractSlottable(slottable)).toThrow('Slottable child cannot be a Fragment')
    })
  })
})
