/**
 * Reads each scenario's esbuild metafile and validates it against the scenario's expected.json.
 *
 * mustInclude/mustExclude entries must (not) match at least one input that contributed bytes to
 * the output. mustIncludePackages/mustExcludePackages do the same but at package-name granularity
 * (`adapters/react/src/...` → `@praxis-kit/react`, `packages/kit/dist/vue/...` → `praxis-kit`) —
 * resilient to a source file moving around inside a package, where a raw path fragment isn't.
 * Prefer the package-level form for new scenarios; the path-fragment form still works and existing
 * scenarios aren't required to migrate.
 *
 * Uses outputs[].inputs[].bytesInOutput rather than top-level inputs so tree-shaken modules
 * (analyzed but contributing 0 bytes) do not trigger false failures.
 *
 * Exits with code 1 if any assertion fails.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AnyRecord, StringMap } from '@praxis-kit/primitive'

const pkg = dirname(fileURLToPath(import.meta.url))
const distDir = join(pkg, '../dist')
const scenariosDir = join(pkg, '../scenarios')

type Expected = {
  mustInclude?: string[]
  mustExclude?: string[]
  mustIncludePackages?: string[]
  mustExcludePackages?: string[]
}

type OutputInputs = StringMap<{ bytesInOutput: number }>

type Metafile = {
  inputs: AnyRecord
  outputs: StringMap<{ inputs: OutputInputs }>
}

function getLiveInputPaths(metafile: Metafile): string[] {
  const live: string[] = []
  for (const outData of Object.values(metafile.outputs)) {
    for (const [path, data] of Object.entries(outData.inputs)) {
      if (data.bytesInOutput > 0) live.push(path)
    }
  }
  return live
}

// Best-effort path → package-name resolver, covering this repo's own layout. A path this doesn't
// recognize contributes no package name (never silently matches everything).
function toPackageName(path: string): string | undefined {
  let m = /^adapters\/([^/]+)\//.exec(path)
  if (m) return `@praxis-kit/${m[1]}`
  m = /^lib\/([^/]+)\//.exec(path)
  if (m) return `@praxis-kit/${m[1]}`
  if (/^packages\/core\//.test(path)) return '@praxis-kit/core'
  if (/^packages\/kit\/dist\//.test(path)) return 'praxis-kit'
  return undefined
}

function scenarioLabel(group: string, scenario: string): string {
  return `${group}/${scenario}`
}

function check(label: string, metafile: Metafile, expected: Expected): string[] {
  const live = getLiveInputPaths(metafile)
  const livePackages = new Set(live.map(toPackageName).filter((p): p is string => p !== undefined))
  const failures: string[] = []

  for (const fragment of expected.mustInclude ?? []) {
    if (!live.some((p) => p.includes(fragment))) {
      failures.push(
        `FAIL [${label}] mustInclude "${fragment}" — not found in bundle output (0 live bytes)`,
      )
    }
  }

  for (const fragment of expected.mustExclude ?? []) {
    const matched = live.filter((p) => p.includes(fragment))
    if (matched.length > 0) {
      failures.push(
        `FAIL [${label}] mustExclude "${fragment}" — unexpectedly contributed live code:\n` +
          matched.map((p) => `       ${p}`).join('\n'),
      )
    }
  }

  for (const name of expected.mustIncludePackages ?? []) {
    if (!livePackages.has(name)) {
      failures.push(
        `FAIL [${label}] mustIncludePackages "${name}" — no live input resolved to this package`,
      )
    }
  }

  for (const name of expected.mustExcludePackages ?? []) {
    if (livePackages.has(name)) {
      failures.push(`FAIL [${label}] mustExcludePackages "${name}" — package contributed live code`)
    }
  }

  return failures
}

async function listScenarios(groupDir: string): Promise<string[]> {
  try {
    const entries = await readdir(groupDir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

const allFailures: string[] = []
let passed = 0
let total = 0

for (const group of ['source', 'package'] as const) {
  const scenarios = await listScenarios(join(scenariosDir, group))

  for (const scenario of scenarios) {
    total++
    const label = scenarioLabel(group, scenario)
    const metaPath = join(distDir, group, scenario, 'meta.json')
    const expectedPath = join(scenariosDir, group, scenario, 'expected.json')

    let metafile: Metafile
    let expected: Expected

    try {
      metafile = JSON.parse(await readFile(metaPath, 'utf8')) as Metafile
    } catch {
      allFailures.push(`FAIL [${label}] meta.json missing — run pnpm build first`)
      continue
    }

    try {
      expected = JSON.parse(await readFile(expectedPath, 'utf8')) as Expected
    } catch {
      allFailures.push(`FAIL [${label}] expected.json missing or invalid`)
      continue
    }

    const liveCount = getLiveInputPaths(metafile).length
    const failures = check(label, metafile, expected)
    if (failures.length === 0) {
      console.log(`  pass   ${label} (${liveCount} live modules)`)
      passed++
    } else {
      for (const f of failures) console.error(f)
      allFailures.push(...failures)
    }
  }
}

console.log(`\n${passed}/${total} scenario(s) passed assertions`)

if (allFailures.length > 0) {
  process.exit(1)
}
