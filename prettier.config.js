/** @type {import('prettier').Config} */
export default {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  semi: false,
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  proseWrap: 'always',
  plugins: ['prettier-plugin-tailwindcss'],
  overrides: [
    {
      files: '*.{yml,yaml}',
      options: {
        singleQuote: false,
      },
    },
    {
      files: '*.json',
      options: {
        printWidth: 80,
      },
    },
  ],
}
