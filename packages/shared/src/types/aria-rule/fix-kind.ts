export type RemoveAttributeFixKind = `removeAttribute:${string}`
export type InjectLiveFixKind = `injectLive:${string}`
export type FixKind =
  | 'removeRole'
  | 'setRole'
  | 'normalizeRelevantAll'
  | RemoveAttributeFixKind
  | InjectLiveFixKind
