export function resolveTag<TDefault, TAs>(defaultTag: TDefault, as?: TAs) {
  return as ?? defaultTag
}
