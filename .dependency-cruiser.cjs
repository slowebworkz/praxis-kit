/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ── framework leakage ──────────────────────────────────────────────────
    {
      name: 'core-no-react',
      severity: 'error',
      comment: 'core must remain framework-agnostic — no React imports allowed',
      from: { path: '^packages/core/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-peer'],
        path: '^(react|react-dom|@radix-ui/)',
      },
    },
    {
      name: 'core-no-vue',
      severity: 'error',
      comment: 'core must remain framework-agnostic — no Vue imports allowed',
      from: { path: '^packages/core/' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-peer'], path: '^(vue|@vue/)' },
    },

    // ── cross-adapter isolation ────────────────────────────────────────────
    {
      name: 'react-no-vue',
      severity: 'error',
      comment: 'react adapter must not import from the vue adapter',
      from: { path: '^packages/react/' },
      to: { path: '^packages/vue/' },
    },
    {
      name: 'vue-no-react',
      severity: 'error',
      comment: 'vue adapter must not import from the react adapter',
      from: { path: '^packages/vue/' },
      to: { path: '^packages/react/' },
    },
    {
      name: 'react-no-vue-pkg',
      severity: 'error',
      from: { path: '^packages/react/' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-peer'], path: '^(vue|@vue/)' },
    },
    {
      name: 'vue-no-react-pkg',
      severity: 'error',
      from: { path: '^packages/vue/' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-peer'], path: '^(react|react-dom)' },
    },

    // ── dependency direction ───────────────────────────────────────────────
    {
      name: 'core-no-adapters',
      severity: 'error',
      comment: 'core must not import from framework adapters or docs',
      from: { path: '^packages/core/' },
      to: { path: '^packages/(react|vue|tailwind|docs)/' },
    },
    {
      name: 'tailwind-no-adapters',
      severity: 'error',
      comment: 'tailwind plugin must not import from framework adapters',
      from: { path: '^packages/tailwind/' },
      to: { path: '^packages/(react|vue|docs)/' },
    },

    // ── cycles ────────────────────────────────────────────────────────────
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },

    // ── orphans ───────────────────────────────────────────────────────────
    {
      name: 'no-orphans',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '(^|/)\\.[^/]+(\\.js)?$',
          '\\.json$',
          'vitest\\.config',
          'tsup\\.config',
          'test-setup\\.ts$',
          'packages/docs/src/(examples|vue-examples)/',
        ],
      },
      to: {},
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(\\.test\\.(ts|tsx)$|vitest\\.config|tsup\\.config|dist/)' },
    moduleSystems: ['es6'],
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/[^/]+' },
    },
  },
}
