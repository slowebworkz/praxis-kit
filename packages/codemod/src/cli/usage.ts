import { readFileSync } from 'node:fs'

const usage = readFileSync(new URL('./usage.md', import.meta.url), 'utf8')

export function printUsage(): void {
  console.error(usage)
}
