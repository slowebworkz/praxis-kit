export type ChildRuleMatch<T, U extends T = T> = (child: T) => child is U
