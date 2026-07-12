// types/class-extract.ts

export type VariantValues = Record<string, string | string[]>
export type VariantMap = Record<string, VariantValues>
export type DefaultMap = Record<string, string>

export type CompoundEntry = {
  conditions: Record<string, string | string[]>
  cls: string | string[]
}

export type StylingConfig = {
  variantMap: VariantMap
  defaults: DefaultMap
  compounds: CompoundEntry[]
}
