---
'praxis-kit': minor
---

Class plugins can now declare a flattened prop shape for the type-extraction path. `ClassPlugin` and
`ClassPluginFactory` take an optional second `TFlatProps` generic (defaulting to `TProps`), with new
`ExtractPluginFlatProps` and `FlattenPluginProps` helpers. `createTailwindPipeline` declares
`FlatLayoutProps`, so `ContractProps<T>` on the React and Preact adapters no longer needs
adapter-side knowledge of the Tailwind layout keys. Public `ContractProps` output is unchanged.
