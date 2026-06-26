const angular = require('@angular-eslint/eslint-plugin');
const angularTemplate = require('@angular-eslint/eslint-plugin-template');
const angularTemplateParser = require('@angular-eslint/template-parser');
const boundaries = require('eslint-plugin-boundaries');
const tsParser = require('@typescript-eslint/parser');
const ts = require('@typescript-eslint/eslint-plugin');

const tsStrictRules = {
  ...ts.configs.strict.rules,
  ...ts.configs['strict-type-checked'].rules,
  ...ts.configs['stylistic-type-checked'].rules,
};

module.exports = [
  {
    ignores: ['android/**', 'coverage/**', 'dist/**', 'node_modules/**', 'out-tsc/**', 'www/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
    },
    plugins: {
      '@angular-eslint': angular,
      '@typescript-eslint': ts,
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'src/app/core/**' },
        { type: 'shared', pattern: 'src/app/shared/**' },
        { type: 'features', pattern: 'src/app/features/**' },
        { type: 'app-shell', pattern: 'src/app/*' },
      ],
    },
    rules: {
      ...tsStrictRules,
      ...angular.configs.recommended.rules,
      '@angular-eslint/component-class-suffix': [
        'error',
        {
          suffixes: ['Page', 'Component'],
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: { type: 'features' },
              disallow: { to: { type: 'features' } },
              message:
                'Features must use relative imports internally and must not import other features.',
            },
          ],
        },
      ],
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@capacitor/*'],
              message: 'Use Capacitor only from infrastructure adapters or core native adapters.',
            },
            {
              group: ['@env/*'],
              message: 'Expose environment values through typed injected config tokens.',
            },
            {
              group: ['@features/*'],
              message: 'Features must not import from other features directly.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.component.ts', 'src/**/*.page.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  {
    files: ['capacitor.config.ts', 'src/main.ts', 'src/app/core/config/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@capacitor/*'],
              message: 'Use Capacitor only from infrastructure adapters or core native adapters.',
            },
            {
              group: ['@features/*'],
              message: 'Features must not import from other features directly.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/core/logging/console-logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['capacitor.config.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    rules: {
      ...angularTemplate.configs.recommended.rules,
      ...angularTemplate.configs.accessibility.rules,
    },
  },
];
