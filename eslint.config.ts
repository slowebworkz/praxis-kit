import type { ESLintConfig } from './configs/types'
import base from './configs/base'
import ts from './configs/typescript'
import architecture from './configs/architecture'
import imports from './configs/imports'
import unicorn from './configs/unicorn'

// Ported from ../pk. The `@praxis-kit` ESLint plugin (plugins/eslint) and the
// self-validation block that runs its rules over workspace source are added back
// once that package exists — see DECISIONS.md. `configs/architecture.ts`'s
// boundaries element patterns are inert until the packages they name land.
const config = [...base, ...ts, ...architecture, ...imports, ...unicorn] satisfies ESLintConfig

export default config
