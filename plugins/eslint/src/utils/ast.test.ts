/**
 * Targeted regression test for one specific AST edge case flagged in review: a computed property
 * with a literal key (`{ ['sm']: 'x' }`) is skipped by `getPropertyKey`/`extractVariantMap` the
 * same way a computed identifier key (`{ [foo]: 'x' }`) is. That's the conservative, intended
 * behavior — `getPropertyKey` bails on `prop.computed` before ever looking at what the key
 * expression actually is — but it's precisely the kind of case a future "improvement" (e.g.
 * "special-case a computed *literal* key, since we can read its value") could change without
 * realizing it's a behavior change, not just an optimization. No other file in this plugin
 * exercised this path before this test.
 *
 * Nodes below are minimal hand-built ESTree shapes (only the fields `getPropertyKey`/
 * `extractVariantMap` actually read), not parsed from real source — this plugin has no direct
 * dependency on a standalone parser package, and pulling one in just for two narrow unit tests
 * isn't worth it.
 */
import { describe, expect, it } from 'vitest'
import type { TSESTree } from '@typescript-eslint/utils'
import { extractVariantMap, getPropertyKey } from './ast'

function literalProperty(key: string, computed: boolean): TSESTree.Property {
  return {
    type: 'Property',
    computed,
    key: { type: 'Literal', value: key },
    value: { type: 'Literal', value: `class-${key}` },
    kind: 'init',
    method: false,
    shorthand: false,
    optional: false,
  } as unknown as TSESTree.Property
}

function identifierProperty(name: string, valueProperties: TSESTree.Property[]): TSESTree.Property {
  return {
    type: 'Property',
    computed: false,
    key: { type: 'Identifier', name },
    value: { type: 'ObjectExpression', properties: valueProperties },
    kind: 'init',
    method: false,
    shorthand: false,
    optional: false,
  } as unknown as TSESTree.Property
}

describe('getPropertyKey', () => {
  it('reads a plain identifier key', () => {
    expect(getPropertyKey(identifierProperty('size', []))).toBe('size')
  })

  it('reads a non-computed string-literal key', () => {
    expect(getPropertyKey(literalProperty('sm', false))).toBe('sm')
  })

  it('skips a computed identifier key (`{ [foo]: ... }`)', () => {
    const prop = {
      type: 'Property',
      computed: true,
      key: { type: 'Identifier', name: 'foo' },
      value: { type: 'Literal', value: 'x' },
      kind: 'init',
      method: false,
      shorthand: false,
      optional: false,
    } as unknown as TSESTree.Property
    expect(getPropertyKey(prop)).toBeUndefined()
  })

  it("skips a computed *literal* key (`{ ['sm']: ... }`) — same as a computed identifier, not a special case", () => {
    // The conservative behavior this test locks down: `prop.computed` bails before
    // `getPropertyKey` ever inspects what the key expression is, so a computed literal is
    // indistinguishable from a computed identifier here — both are skipped.
    expect(getPropertyKey(literalProperty('sm', true))).toBeUndefined()
  })
})

describe('extractVariantMap — computed literal keys', () => {
  it('drops a variant value declared via a computed literal key from the resulting Set', () => {
    const variantsNode = {
      type: 'ObjectExpression',
      properties: [
        identifierProperty('size', [
          literalProperty('sm', false),
          literalProperty('lg', true), // computed literal — dropped
        ]),
      ],
    } as unknown as TSESTree.ObjectExpression

    const map = extractVariantMap(variantsNode)
    expect(map?.get('size')).toEqual(new Set(['sm']))
  })

  it('drops an entire variant declared via a computed literal key from the resulting Map', () => {
    const variantsNode = {
      type: 'ObjectExpression',
      properties: [literalProperty('size', true)],
    } as unknown as TSESTree.ObjectExpression

    const map = extractVariantMap(variantsNode)
    expect(map?.size).toBe(0)
  })
})
