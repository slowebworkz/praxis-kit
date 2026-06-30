export interface MergeStrategy<TContext> {
  merge(previous: TContext, incoming: Partial<TContext>): TContext
}
