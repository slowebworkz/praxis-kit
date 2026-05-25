import type { ESLintConfig } from './configs/types'

import base from './configs/base.js'
import ts from './configs/typescript.js'
import architecture from './configs/architecture.js'
import polymorphicPlugin from './packages/eslint-plugin/src/index.js'

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
            'lib/*/vitest.config.ts',
            'lib/*/eslint.config.ts',
          ],
          // ~17 files: 2 root *.ts + 1 scripts + 4 configs src + 3 configs .d.ts + 7 per-package eslint configs + lib/ configs
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 30,
          defaultProject: './tsconfig.base.json',
        },
      },
    },
  },

  ...architecture,

  // Self-validate: run the plugin's own rules on all workspace source.
  {
    files: ['packages/*/src/**/*.{ts,tsx}', 'packages/docs/**/*.{ts,tsx}'],
    plugins: { '@polymorphic-ui': polymorphicPlugin },
    rules: {
      '@polymorphic-ui/no-dead-compound': 'error',
      '@polymorphic-ui/no-enforcement-without-strict': 'error',
      '@polymorphic-ui/no-invalid-default': 'error',
      '@polymorphic-ui/no-redundant-role': 'warn',
      '@polymorphic-ui/valid-cardinality': 'error',
    },
  },
] satisfies ESLintConfig

export default config
