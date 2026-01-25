import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import lit from 'eslint-plugin-lit';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      lit,
    },
    rules: {
      // Lit rules for web components
      'lit/no-legacy-template-syntax': 'error',
      'lit/no-template-arrow': 'warn',
      'lit/attribute-value-entities': 'error',

      // TypeScript rules - relaxed for existing codebase
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  // Test files - allow Chai assertion syntax
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/generated/**',
      '**/*.d.ts',
      '**/src-tauri/**',
    ],
  }
);
