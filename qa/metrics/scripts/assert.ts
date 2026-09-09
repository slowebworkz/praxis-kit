// The CI gate over snapshots/metrics.json. Architecture violations are a hard gate (non-zero
// exit); public-API and complexity growth against a git-committed baseline are warn-only.
//
// Run: pnpm --filter @praxis-kit/metrics assert (after `collect` has written a fresh snapshot)

import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { iterate } from '@praxis-kit/foundation'
import type { ReadonlyDeep } from 'type-fest'
import type { Snapshot } from './types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_PATH = join(__dirname, '..', 'snapshots', 'metrics.json')

// The real path in both repos' actual layout — ../pk's own assert.ts reads
// `lib/metrics/snapshots/metrics.json`, a location that never existed in either repo (its
// package has always been `qa/metrics`), silently no-op'ing every soft-gate comparison there on
// every real run. Fixed here, not carried forward. See DECISIONS.md.
const BASELINE_GIT_PATH = 'qa/metrics/snapshots/metrics.json'

function tryExec(command: string): string | null {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim()
  } catch {
    return null
  }
}

function resolveBaseline(): ReadonlyDeep<Snapshot> | null {
  const refs = [tryExec('git merge-base HEAD origin/main'), 'HEAD~1', 'HEAD'].filter(
    (ref): ref is string => ref !== null,
  )

  for (const ref of refs) {
    const content = tryExec(`git show ${ref}:${BASELINE_GIT_PATH}`)
    if (content) return JSON.parse(content) as ReadonlyDeep<Snapshot>
  }
  return null
}

function percentGrowth(previous: number, current: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}

function checkArchitecture(current: ReadonlyDeep<Snapshot>): boolean {
  if (current.architecture.violations > 0) {
    console.error(
      `✗ architecture: ${current.architecture.violations} dependency violation(s) detected`,
    )
    return false
  }
  console.log('✓ architecture: dependency graph clean')
  return true
}

function checkPublicApiGrowth(
  current: ReadonlyDeep<Snapshot>,
  previous: ReadonlyDeep<Snapshot>,
): void {
  const currentExports = current.architecture.exports
  const previousExports = previous.architecture.exports

  iterate.forEachEntry(currentExports, (name, counts) => {
    const prevCounts = previousExports[name]
    const total = counts.values + counts.types
    if (!prevCounts) {
      console.warn(`⚠ public API: "${name}" is a new package export surface (${total} exports)`)
      return
    }
    const prevTotal = prevCounts.values + prevCounts.types
    if (total > prevTotal) {
      console.warn(`⚠ public API: "${name}" grew from ${prevTotal} to ${total} exports`)
    }
  })

  iterate.forEachKey(previousExports, (name) => {
    if (!(name in currentExports)) {
      console.warn(`⚠ public API: "${name}" no longer has any tracked exports`)
    }
  })
}

function checkComplexityGrowth(
  current: ReadonlyDeep<Snapshot>,
  previous: ReadonlyDeep<Snapshot>,
): void {
  iterate.forEachEntry(current.complexity, (key, metrics) => {
    const prevMetrics = previous.complexity[key]
    if (!prevMetrics) return

    const growthPercent = percentGrowth(prevMetrics.loc, metrics.loc)
    const growthAbsolute = metrics.loc - prevMetrics.loc
    if (growthPercent >= 20 && growthAbsolute >= 20) {
      console.warn(
        `⚠ complexity: "${key}" grew ${growthPercent.toFixed(0)}% (${prevMetrics.loc} → ${metrics.loc} LOC)`,
      )
    }
  })
}

function main(): void {
  if (!existsSync(SNAPSHOT_PATH)) {
    console.error("No snapshot found — run 'pnpm collect' first.")
    process.exitCode = 1
    return
  }

  const current = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8')) as ReadonlyDeep<Snapshot>

  let failed = false
  if (!checkArchitecture(current)) failed = true

  const previous = resolveBaseline()
  if (!previous) {
    console.log('✓ public API / complexity: no committed baseline found — skipping growth check')
  } else {
    checkPublicApiGrowth(current, previous)
    checkComplexityGrowth(current, previous)
  }

  if (failed) {
    process.exitCode = 1
  } else {
    console.log('\n✓ all hard gates passed')
  }
}

main()
