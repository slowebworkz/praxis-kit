// Plugin-internal types for dead-variant detection.
// VariantValue and VariantMap are used directly from @praxis-ui/core.

// The active variant value chosen per dimension for a render.
export type VariantSelection = Record<string, string>

// A compound-variant rule, loosely typed: only the keys matter for compound
// dimension detection — the class value and condition types are intentionally
// `unknown` to avoid coupling to core's parameterized CompoundVariant<V>.
export type CompoundVariant = { class?: unknown; [key: string]: unknown }
