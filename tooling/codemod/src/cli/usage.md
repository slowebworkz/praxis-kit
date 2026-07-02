Usage: praxis-codemod <command> [options]

Commands: migrate Rewrite import paths and rename the factory function in one pass (recommended)
rename Rename a factory function across your codebase (ESM named imports only) migrate-paths Rewrite
@praxis-kit/_ import paths to praxis-kit/_

Notes:

- Namespace imports (import \* as X from '@praxis-kit/react') are not renamed. Migrate those
  manually after running the codemod.
- CJS destructuring (const { fn } = require(...)) is not renamed.
- Re-exports (export { fn } from '...') are renamed by the rename command.

Options for migrate / rename: --from <name> Factory function name to rename (default:
createPolymorphicComponent) --to <name> New factory function name (default: createContractComponent)
--tsconfig <path> Path to tsconfig.json for richer symbol resolution (default: none)

Options for migrate / migrate-paths: --files <glob> Glob pattern for files to transform (default for
rename: **/\*.{ts,tsx}) (default for migrate / migrate-paths: **/\*.{ts,tsx,cts,mts,js,jsx,cjs,mjs})

Shared options: --dry-run Preview changes without writing to disk (prints summary only) --verbose
Print each individual change --help Show this help message
