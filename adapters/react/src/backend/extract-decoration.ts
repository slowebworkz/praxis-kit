import type {
  AttributeMap,
  AttributeValue,
  ListenerMap,
  NodeDecoration,
  StyleMap,
  StyleValue,
  VariantMap,
} from '@praxis-kit/runtime'
import type { AnyRecord } from '@praxis-kit/primitive'
import { isNumber, isObject, isString, iterate, isFunction } from '@praxis-kit/primitive'

type DecorationCollectionKey = 'attributes' | 'styles' | 'listeners' | 'variants'

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

  iterate.forEachEntry(value, (k, v) => {
    if (isStyleValue(v)) {
      styles[k] = v
    }
  })

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

  iterate.forEachEntry(props, (key, value) => {
    if (key === 'children' || key === 'slot' || key === 'ref') return

    if (key === 'style' && extractStyles(value, styles)) return

    if (extractListener(key, value, listeners)) return

    if (isAttributeValue(value)) {
      extractAttributeOrVariant(key, value, attributes, variants, variantKeys)
    }
  })

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
