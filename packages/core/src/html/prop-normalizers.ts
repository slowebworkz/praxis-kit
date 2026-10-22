import type { PropNormalizer } from '../types'
import { disabledProps, invalidProps, readonlyProps } from '@praxis-kit/contract'
import { isString } from '@praxis-kit/guards'

const HTML_FORM_NORMALIZERS: ReadonlyMap<string, readonly PropNormalizer[]> = new Map([
  ['button', [disabledProps]],
  ['input', [disabledProps, readonlyProps, invalidProps]],
  ['select', [disabledProps]],
  ['textarea', [disabledProps, readonlyProps]],
  ['fieldset', [disabledProps]],
  ['optgroup', [disabledProps]],
])

export function getHtmlPropNormalizers(tag: unknown): readonly PropNormalizer[] | undefined {
  return isString(tag) ? HTML_FORM_NORMALIZERS.get(tag) : undefined
}
