import type { DefaultVariants, VariantMap } from '..'

export interface CVADefaults<V extends VariantMap> {
  defaultVariants?: DefaultVariants<V>
}
