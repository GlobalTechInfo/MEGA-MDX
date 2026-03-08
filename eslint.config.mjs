import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      // ── TypeScript ────────────────────────────────────────────────
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '.*'
      }],
      '@typescript-eslint/no-explicit-any': 'off',

      // ── Real bug catchers (errors) ────────────────────────────────
      'no-undef': 'off',               // TS handles this
      'no-unused-vars': 'off',         // TS version above
      'no-constant-condition': 'error',
      'no-duplicate-case': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unreachable': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-throw-literal': 'error',
      'no-return-assign': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-extend-native': 'error',
      'no-sequences': 'error',
      'radix': 'error',
      'no-mixed-spaces-and-tabs': 'error',
    }
  }
];
