// Inlined rather than read from a sibling `.md` at runtime: the CLI is bundled
// (standalone `dist/` and, later, into `praxis-kit`) and a `readFileSync` against
// `import.meta.url` breaks once the asset isn't beside the emitted entry.
export const usage = `Usage: praxis-codemod <command> [options]

Commands:
  migrate         Rewrite import paths and rename the factory function in one pass (recommended)
  rename          Rename a Praxis Kit factory imported/re-exported from @praxis-kit or praxis-kit
  migrate-paths   Rewrite @praxis-kit/* import paths to praxis-kit/*

Notes:
  - rename only touches a name imported/re-exported from a @praxis-kit or praxis-kit specifier —
    an identically-named symbol from elsewhere is left alone.
  - Namespace imports (import * as X from '@praxis-kit/react') are not renamed.
  - CJS destructuring (const { fn } = require(...)) is not renamed.
  - Named re-exports (export { fn } from '...') are renamed by the rename command.

Options for migrate / rename:
  --from <name>      Factory function to rename (default: createPolymorphicComponent)
  --to <name>        New factory function name (default: createContractComponent)
  --tsconfig <path>  Path to tsconfig.json for richer symbol resolution (default: none)

Options for migrate / migrate-paths:
  --files <glob>     Glob of files to transform
                       rename default:                 **/*.{ts,tsx}
                       migrate / migrate-paths default: **/*.{ts,tsx,cts,mts,js,jsx,cjs,mjs}

Shared options:
  --dry-run          Preview changes without writing to disk (prints summary only)
  --verbose          Print each individual change
  --help             Show this help message
`

export function printUsage(): void {
  console.error(usage)
}
