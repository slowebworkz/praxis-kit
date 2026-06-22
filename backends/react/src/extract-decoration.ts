import type {
  AttributeMap,
  AttributeValue,
  ListenerMap,
  NodeDecoration,
  StyleMap,
  StyleValue,
  VariantMap,
} from '@pk2/core'
import { isNumber, isObject, isString } from '@praxis-kit/primitive'

function isStyleValue(v: unknown): v is StyleValue {
  return isString(v) || isNumber(v)
}

function isAttributeValue(v: unknown): v is AttributeValue {
  return isString(v) || isNumber(v) || typeof v === 'boolean'
}

function assignIfNotEmpty<T extends object>(
  target: NodeDecoration,
  key: keyof NodeDecoration,
  value: T,
): void {
  if (Object.keys(value).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(target as any)[key] = value
  }
}

export function extractDecoration(
  props: Record<string, unknown>,
  variantKeys?: ReadonlySet<string>,
): NodeDecoration {
  const attributes: AttributeMap = {}
  const styles: StyleMap = {}
  const listeners: ListenerMap = {}
  const variants: VariantMap = {}
  const dec: NodeDecoration = {}

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'slot' || key === 'ref') continue

    if (key === 'style' && isObject(value)) {
      for (const [k, v] of Object.entries(value)) {
        if (isStyleValue(v)) styles[k] = v
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      listeners[key] = value as ListenerMap[string]
    } else if (isAttributeValue(value)) {
      if (variantKeys !== undefined && variantKeys.has(key)) {
        variants[key] = value
      } else {
        attributes[key] = value
      }
    }
  }

  assignIfNotEmpty(dec, 'attributes', attributes)
  assignIfNotEmpty(dec, 'styles', styles)
  assignIfNotEmpty(dec, 'listeners', listeners)
  assignIfNotEmpty(dec, 'variants', variants)
  const ref = props['ref']
  if (ref !== undefined) dec.ref = ref

  return dec
}
