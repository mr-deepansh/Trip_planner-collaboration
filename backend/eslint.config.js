import globals from 'globals';
import pluginJs from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'logs/**', 'coverage/**']
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021
      },
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  },
  pluginJs.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    rules: {
      // Error prevention and code quality
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      'no-undef': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }], // Use a logger in production
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],

      // Async/Await
      'require-await': 'error',
      'no-return-await': 'error',

      // Control flow consistency
      curly: ['error', 'all'],
      'default-case': 'error',

      // Security & safety
      'no-eval': 'error',
      'no-implied-eval': 'error'
    }
  }
];
