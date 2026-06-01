// Internal shapes the Tailwind plugin reconstructs the CVA variant surface into
// for dead-variant detection. Not part of the public API — imported directly by
// create-tailwind-pipeline.ts, intentionally absent from the types barrel.

// The variant config: dimension → state → class(es).
export type VariantValue = string | readonly string[]
export type VariantStates = Record<string, VariantValue>
export type VariantConfig = Record<string, VariantStates>

// The active variant value chosen per dimension for a render.
export type VariantSelection = Record<string, string>

// A compound-variant rule, loosely: condition keys plus a `class`. Only the keys
// matter for dead-variant skipping, so the value types stay `unknown`.
export type CompoundVariant = { class?: unknown; [key: string]: unknown }
