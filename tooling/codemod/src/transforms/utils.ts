export function logRewrite(isVerbose: boolean, isDryRun: boolean, message: string): void {
  if (!isVerbose) return
  const prefix = isDryRun ? '[dry-run] ' : ''
  console.log(prefix + message)
}
