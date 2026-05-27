import type { ESLintConfig } from './configs/types'
import type { Plugin } from 'eslint'

import base from './configs/base.js'
import ts from './configs/typescript.js'
import architecture from './configs/architecture.js'
import praxisPlugin from './packages/eslint-plugin/src/index.js'

const TS_FILES = ['**/*.{ts,mts,cts,tsx}']

const config = [
  ...base,
  ...ts,

  // Root-level files (scripts/, configs/, per-package eslint.config.ts) are
  // not included by any package tsconfig — broaden allowDefaultProject so the
  // project service can parse them.
  {
    files: TS_FILES,
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            '*.ts',
            'scripts/*.ts',
            'configs/*.ts',
            'packages/*/eslint.config.ts',
            // codemod and ts-plugin have rootDir:src — tsup.config.ts can't be in their tsconfig include
            'packages/codemod/tsup.config.ts',
            'packages/ts-plugin/tsup.config.ts',
            // remaining tsup.config.ts files are included in each package's tsconfig — removed from here
            // lib/contract and lib/styling include vitest.config.ts in their tsconfig — listed explicitly
            'lib/adapter-utils/vitest.config.ts',
            'lib/primitive/vitest.config.ts',
            'lib/*/eslint.config.ts',
          ],
          // ~23 files: 2 root *.ts + 1 scripts + 7 configs + 9 per-package eslint configs + 2 lib vitest + 2 tsup (codemod/ts-plugin)
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 28,
          defaultProject: './tsconfig.base.json',
        },
      },
    },
  },

  ...architecture,

  // Self-validate: run the plugin's own rules on all workspace source.
  {
    files: ['packages/*/src/**/*.{ts,tsx}', 'packages/docs/**/*.{ts,tsx}'],
    plugins: { '@praxis-ui': praxisPlugin as unknown as Plugin },
    rules: {
      '@praxis-ui/no-dead-compound': 'error',
      '@praxis-ui/no-enforcement-without-strict': 'error',
      '@praxis-ui/no-invalid-default': 'error',
      '@praxis-ui/no-redundant-role': 'warn',
      '@praxis-ui/valid-cardinality': 'error',
      '@praxis-ui/valid-children-config': 'error',
    },
  },
] satisfies ESLintConfig

export default config
