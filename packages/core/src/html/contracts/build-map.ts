/**
 * Builds a lookup table from grouped keys.
 *
 * Each key in a group is associated with the group's shared value. Used to
 * expand compact declarations into a flat lookup record.
 */
export function buildMap<K extends PropertyKey, V>(
  groups: readonly (readonly [readonly K[], V])[],
): Record<K, V> {
  return Object.fromEntries(
    groups.flatMap(([keys, value]) => keys.map((key) => [key, value] as const)),
  ) as Record<K, V>
}
