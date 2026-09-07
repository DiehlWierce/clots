import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  // public/sw.js исполняется браузером как есть и живёт в среде service
  // worker, которой нет в конфигурации проекта.
  { ignores: ['dist', 'coverage', 'node_modules', 'public/sw.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['*.config.{js,ts}', 'tests/**/*.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // Скрипты и E2E печатают в терминал: это их прямое назначение —
    // замеры и отчёты видны в логах CI.
    files: ['scripts/**/*.ts', 'e2e/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
)
