import type {
  AttributeMap,
  AttributeValue,
  ListenerMap,
  NodeDecoration,
  StyleMap,
  StyleValue,
  VariantMap,
} from '@pk2/core'
import type { AnyRecord } from '@pk2/foundation'
import { isNumber, isObject, isString } from '@praxis-kit/primitive'
import { isFunction } from '@praxis-kit/shared'
import type { DecorationCollectionKey } from './types'

function isStyleValue(v: unknown): v is StyleValue {
  return isString(v) || isNumber(v)
}

function isAttributeValue(v: unknown): v is AttributeValue {
  return isString(v) || isNumber(v) || typeof v === 'boolean'
}

function assignIfNotEmpty<K extends DecorationCollectionKey>(
  target: NodeDecoration,
  key: K,
  value: NonNullable<NodeDecoration[K]>,
): void {
  if (Object.keys(value).length > 0) {
    target[key] = value
  }
}

function extractStyles(value: unknown, styles: StyleMap): boolean {
  if (!isObject(value)) return false

  for (const [k, v] of Object.entries(value)) {
    if (isStyleValue(v)) {
      styles[k] = v
    }
  }

  return true
}

function extractListener(key: string, value: unknown, listeners: ListenerMap): boolean {
  if (!key.startsWith('on') || !isFunction(value)) {
    return false
  }

  listeners[key] = value as ListenerMap[string]
  return true
}

function extractAttributeOrVariant(
  key: string,
  value: AttributeValue,
  attributes: AttributeMap,
  variants: VariantMap,
  variantKeys?: ReadonlySet<string>,
): void {
  if (variantKeys?.has(key)) {
    variants[key] = value
  } else {
    attributes[key] = value
  }
}

export function extractDecoration(
  props: AnyRecord,
  variantKeys?: ReadonlySet<string>,
): NodeDecoration {
  const attributes: AttributeMap = {}
  const styles: StyleMap = {}
  const listeners: ListenerMap = {}
  const variants: VariantMap = {}
  const dec: NodeDecoration = {}

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'slot' || key === 'ref') continue

    if (key === 'style' && extractStyles(value, styles)) {
      continue
    }

    if (extractListener(key, value, listeners)) {
      continue
    }

    if (isAttributeValue(value)) {
      extractAttributeOrVariant(key, value, attributes, variants, variantKeys)
    }
  }

  assignIfNotEmpty(dec, 'attributes', attributes)
  assignIfNotEmpty(dec, 'styles', styles)
  assignIfNotEmpty(dec, 'listeners', listeners)
  assignIfNotEmpty(dec, 'variants', variants)

  const ref = props.ref
  if (ref !== undefined) {
    dec.ref = ref
  }

  return dec
}
