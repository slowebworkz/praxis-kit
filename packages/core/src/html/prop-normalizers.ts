import type { PropNormalizer } from '../types'
import { disabledProps, invalidProps, readonlyProps } from '@praxis-kit/contract'

const HTML_FORM_NORMALIZERS: ReadonlyMap<string, readonly PropNormalizer[]> = new Map([
  ['button', [disabledProps]],
  ['input', [disabledProps, readonlyProps, invalidProps]],
  ['select', [disabledProps]],
  ['textarea', [disabledProps, readonlyProps]],
  ['fieldset', [disabledProps]],
  ['optgroup', [disabledProps]],
])

export function getHtmlPropNormalizers(tag: unknown): readonly PropNormalizer[] | undefined {
  return typeof tag === 'string' ? HTML_FORM_NORMALIZERS.get(tag) : undefined
}
