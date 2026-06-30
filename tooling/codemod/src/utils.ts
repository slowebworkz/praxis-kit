export function dryRunSuffix(isDryRun: boolean): string {
  return isDryRun ? ' (dry run — no files written)' : ''
}
