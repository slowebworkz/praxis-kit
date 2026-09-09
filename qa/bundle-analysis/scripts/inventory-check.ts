/**
 * Cross-checks scenarios/package/* against packages/kit/package.json's real `exports` map —
 * without this, a new subpath export could land in packages/kit with no bundle-analysis scenario
 * ever created for it, and every other script here would keep passing regardless (they only ever
 * iterate the scenario directories that already exist, so a *missing* scenario is invisible to
 * them by construction). This is the one check in this package that looks outward at what should
 * exist, rather than inward at what already does.
 *
 * Deliberately excludes 5 real exports that have no meaningful bundle-composition question to ask:
 *   - `./tailwind.css` — a CSS asset, not a JS entry; nothing for esbuild to bundle.
 *   - `./svelte/Polymorphic.svelte` — raw .svelte source consumed by the *consumer's* own Svelte
 *     compiler, never bundled by this workspace's tooling (see packages/kit/tsdown.config.ts).
 *   - `./eslint`, `./ts-plugin`, `./vite-plugin`, `./codemod` — tooling entries, never imported
 *     into a consumer's *application* bundle (see scripts/analyze.ts's own scope doc comment).
 *
 * Only checks scenarios/package/* — scenarios/source/* is deliberately narrower by design (only
 * entries with a real workspace-source counterpart get one; see scripts/analyze.ts), so it has no
 * 1:1 relationship with the export map to check here.
 *
 * `process.exit(1)` on any mismatch, matching this package's other scripts' pass/fail convention.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AnyRecord } from '@praxis-kit/primitive'

const pkg = dirname(fileURLToPath(import.meta.url))
const root = join(pkg, '../../..')
const scenariosDir = join(pkg, '../scenarios/package')

const NOT_BUNDLE_ENTRIES = new Set([
  './package.json',
  './tailwind.css',
  './svelte/Polymorphic.svelte',
  './eslint',
  './ts-plugin',
  './vite-plugin',
  './codemod',
])

// `./react/legacy` → `react-legacy` — matches this package's own scenario-naming convention
// (scripts/analyze.ts, scenarios/package/react-legacy).
function exportKeyToScenarioName(key: string): string {
  return key.replace(/^\.\//, '').replace(/\//g, '-')
}

const kitPkg = JSON.parse(
  await readFile(join(root, 'packages/kit/package.json'), 'utf8'),
) as AnyRecord
const exportKeys = Object.keys(kitPkg['exports'] as AnyRecord)

const expectedScenarios = new Set(
  exportKeys.filter((k) => !NOT_BUNDLE_ENTRIES.has(k)).map(exportKeyToScenarioName),
)

const actualEntries = await readdir(scenariosDir, { withFileTypes: true })
const actualScenarios = new Set(actualEntries.filter((e) => e.isDirectory()).map((e) => e.name))

let failures = 0

for (const name of expectedScenarios) {
  if (!actualScenarios.has(name)) {
    console.error(
      `FAIL [package/${name}] packages/kit exports this subpath but no scenario exists for it — ` +
        `add scenarios/package/${name}/entry.ts, or add its export key to NOT_BUNDLE_ENTRIES if ` +
        `it genuinely has nothing to bundle-analyze`,
    )
    failures++
  }
}

for (const name of actualScenarios) {
  if (!expectedScenarios.has(name)) {
    console.error(
      `FAIL [package/${name}] scenario exists but packages/kit no longer exports a matching ` +
        `subpath — remove scenarios/package/${name}, or check exportKeyToScenarioName's mapping`,
    )
    failures++
  }
}

if (failures > 0) {
  console.error(`\n${failures} inventory mismatch(es) found`)
  process.exit(1)
} else {
  console.log(`  pass   ${actualScenarios.size} package/* scenario(s) match packages/kit's exports`)
}
