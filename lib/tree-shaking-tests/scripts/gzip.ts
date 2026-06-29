/**
 * Measures the gzip-compressed size of each scenario bundle and compares against
 * snapshots/gzip.json.
 *
 * On first run (no snapshot file) writes the current sizes and exits cleanly.
 * On subsequent runs, exits with code 1 if any scenario exceeds its snapshot by
 * more than THRESHOLD_PERCENT.
 *
 * To accept new sizes after intentional growth, delete or edit snapshots/gzip.json.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import type { StringMap } from '@pk2/foundation'

const pkg = dirname(fileURLToPath(import.meta.url))
const distDir = join(pkg, '../dist')
const scenariosDir = join(pkg, '../scenarios')
const snapshotPath = join(pkg, '../snapshots/gzip.json')

const THRESHOLD_PERCENT = 5

type Snapshot = StringMap<{ gzip: number }>

const scenarios = await readdir(scenariosDir, { withFileTypes: true }).then((entries) =>
  entries.filter((e) => e.isDirectory()).map((e) => e.name),
)

const current: Snapshot = {}

for (const scenario of scenarios) {
  const bundlePath = join(distDir, scenario, 'bundle.js')
  let raw: Buffer
  try {
    raw = await readFile(bundlePath)
  } catch {
    console.error(`SKIP [${scenario}] bundle.js missing — run pnpm build first`)
    continue
  }
  const compressed = gzipSync(raw)
  current[scenario] = { gzip: compressed.length }
}

let snapshot: Snapshot | null = null
try {
  snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as Snapshot
} catch {
  // No snapshot yet — write current sizes as baseline.
}

if (snapshot === null) snapshot = {}

let failures = 0
let newScenarios = 0

for (const [scenario, { gzip }] of Object.entries(current)) {
  const baseline = snapshot[scenario]?.gzip
  if (baseline === undefined) {
    snapshot[scenario] = { gzip }
    newScenarios++
    console.log(`  new    ${scenario}: ${gzip} bytes gzip (baseline recorded)`)
    continue
  }
  const delta = gzip - baseline
  const pct = (delta / baseline) * 100
  if (pct > THRESHOLD_PERCENT) {
    console.error(
      `  FAIL   ${scenario}: ${gzip} bytes (+${delta}, +${pct.toFixed(1)}%) — ` +
        `exceeds ${THRESHOLD_PERCENT}% regression threshold (baseline: ${baseline})`,
    )
    failures++
  } else {
    const sign = delta >= 0 ? '+' : ''
    console.log(`  pass   ${scenario}: ${gzip} bytes (${sign}${delta} vs baseline)`)
  }
}

if (newScenarios > 0) {
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n')
}

if (failures > 0) {
  console.error(`\n${failures} scenario(s) exceeded gzip regression threshold`)
  process.exit(1)
} else {
  console.log(`\nAll scenarios within gzip threshold`)
}
