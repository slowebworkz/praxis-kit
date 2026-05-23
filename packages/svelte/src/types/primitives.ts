export type UnknownProps = Record<string, unknown>
export type VariantKey = string
export type ResolvedProps = Readonly<UnknownProps>
export type FilterPredicate = (key: string, variantKeys: ReadonlySet<string>) => boolean
