// Post-build step for packages/kit.
//
// 1. Copies static assets tsup doesn't bundle (Tailwind safelist CSS,
//    Polymorphic.svelte) into dist/ verbatim.
// 2. Rewrites the bare `@praxis-kit/diagnostics` specifier left external by
//    tsup to a relative path into dist/_shared/. Relative imports inside a
//    package bypass the exports map in both Node and TypeScript, so the shared
//    module resolves for consumers without becoming a public subpath.
// 3. Enforces the nominal-identity invariant: the Diagnostics class (private
//    members ⇒ nominal typing) must be declared exactly once across dist,
//    in both the d.ts and JS output. Duplicates mean some entry bundled its
//    own copy again, which silently breaks cross-entry assignability.
//
// Run: tsx scripts/postbuild.ts (called from the package's own `build` script)

import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { shallowObjectMerge, startPipeline } from '@praxis-kit/pipeline'
import { runPipeline } from '@praxis-kit/pipeline/node'
import type { Pass } from '@praxis-kit/pipeline'
import { iterate } from '@praxis-kit/primitive'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT_DIR, 'dist')
const SHARED = join(DIST, '_shared', 'diagnostics.js')
const SPECIFIER = '@praxis-kit/diagnostics'

interface Context {
  readonly files?: readonly string[]
}

// tsup only bundles JS/d.ts — the Tailwind v4 safelist is a plain CSS file
// consumed directly by Tailwind's `@source inline(...)` directive, so it must
// be copied into dist verbatim. Without this, the `./tailwind.css` export in
// package.json resolves to a file the build never produced.
const copyTailwindSafelist: Pass<Context> = {
  name: 'copy-tailwind-safelist',
  execute() {
    mkdirSync(join(DIST, 'tailwind'), { recursive: true })
    copyFileSync(
      join(ROOT_DIR, '..', '..', 'lib', 'tailwind', 'src', 'tailwind-safelist.css'),
      join(DIST, 'tailwind', 'safelist.css'),
    )
    console.log('postbuild: copied tailwind safelist.css into dist/tailwind/')
    return {}
  },
}

// tsup only bundles the compiled svelte/index.js entry — Polymorphic.svelte is
// consumed as raw .svelte source by the Svelte compiler at the *consumer's*
// build time, matching how @praxis-kit/svelte itself re-exports it, so it must
// be copied into dist verbatim rather than compiled.
const copyPolymorphicSvelte: Pass<Context> = {
  name: 'copy-polymorphic-svelte',
  execute() {
    mkdirSync(join(DIST, 'svelte'), { recursive: true })
    copyFileSync(
      join(ROOT_DIR, '..', '..', 'adapters', 'svelte', 'src', 'Polymorphic.svelte'),
      join(DIST, 'svelte', 'Polymorphic.svelte'),
    )
    console.log('postbuild: copied Polymorphic.svelte into dist/svelte/')
    return {}
  },
}

const discoverDistFiles: Pass<Context> = {
  name: 'discover-dist-files',
  execute() {
    const distPaths = readdirSync(DIST, { recursive: true }).map((f) => join(DIST, String(f)))
    const files: string[] = [
      ...iterate.filter(distPaths, (f) => /\.(js|cjs|mjs|d\.ts|d\.cts|d\.mts)$/.test(f)),
    ]
    return { context: { files } }
  },
}

const rewriteDiagnosticsSpecifier: Pass<Context> = {
  name: 'rewrite-diagnostics-specifier',
  execute(context) {
    const files = context.files ?? []
    let rewritten = 0
    iterate.forEach(files, (file) => {
      const source = readFileSync(file, 'utf8')
      if (!source.includes(SPECIFIER)) return

      let rel = relative(dirname(file), SHARED).split(sep).join('/')
      if (!rel.startsWith('.')) rel = `./${rel}`

      writeFileSync(
        file,
        source.replaceAll(`'${SPECIFIER}'`, `'${rel}'`).replaceAll(`"${SPECIFIER}"`, `"${rel}"`),
      )
      rewritten++
    })
    console.log(`postbuild: rewrote ${SPECIFIER} in ${rewritten} file(s)`)
    return {}
  },
}

const enforceSingleDeclarationInvariant: Pass<Context> = {
  name: 'enforce-single-declaration-invariant',
  execute(context) {
    const files = context.files ?? []
    const errors: string[] = []
    // d.ts declares `class Diagnostics`; esbuild emits `var Diagnostics = class`.
    iterate.forEach(
      [
        [/\bclass Diagnostics\b/, 'd.ts'],
        [/\bDiagnostics = class\b|\bclass Diagnostics\b/, 'js'],
      ] as const,
      ([pattern, kind]) => {
        const matching = files.filter((f) =>
          kind === 'd.ts' ? /\.d\.(ts|cts|mts)$/.test(f) : /\.(js|cjs|mjs)$/.test(f),
        )
        const found = matching.filter((f) => pattern.test(readFileSync(f, 'utf8')))
        if (found.length !== 1) {
          errors.push(
            `expected exactly 1 ${kind} file declaring class Diagnostics, found ${found.length}:` +
              found.map((f) => `\n  ${relative(DIST, f)}`).join(''),
          )
        }
      },
    )

    // Warn on any other class declared in more than one d.ts — if it has private
    // members it has the same nominal-split problem Diagnostics had.
    const declaredIn = new Map<string, string[]>()
    iterate.forEach(
      iterate.filter(files, (f) => /\.d\.(ts|cts|mts)$/.test(f)),
      (file) => {
        const names = new Set(
          [...readFileSync(file, 'utf8').matchAll(/^declare class ([A-Za-z0-9_$]+)/gm)].map(
            (m) => m[1] as string,
          ),
        )
        iterate.forEachSet(names, (name) => {
          if (!declaredIn.has(name)) declaredIn.set(name, [])
          declaredIn.get(name)?.push(relative(DIST, file))
        })
      },
    )
    iterate.forEach(iterate.mapEntries(declaredIn), ([name, locations]) => {
      if (locations.length > 1) {
        console.warn(
          `postbuild: warning — class ${name} declared in ${locations.length} d.ts files ` +
            `(nominal-split risk if it has private members): ${locations.join(', ')}`,
        )
      }
    })

    if (errors.length > 0) {
      throw new Error(`postbuild: FAILED\n${errors.join('\n')}`)
    }
    console.log('postbuild: Diagnostics single-declaration invariant holds')
    return {}
  },
}

const pipeline = startPipeline<Context>({
  name: 'postbuild',
  strategy: 'sequential',
  merge: shallowObjectMerge,
})
  .then(copyTailwindSafelist)
  .then(copyPolymorphicSvelte)
  .then(discoverDistFiles)
  .then(rewriteDiagnosticsSpecifier)
  .then(enforceSingleDeclarationInvariant)
  .build()

await runPipeline(pipeline, {})
