const angular = require('@angular-eslint/eslint-plugin');
const angularEslint = require('angular-eslint');
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
const rulesFromConfigs = (configs) =>
  Object.assign({}, ...configs.map((config) => config.rules ?? {}));
const angularRecommendedRules = rulesFromConfigs(angularEslint.configs.tsRecommended);
const angularTemplateRecommendedRules = rulesFromConfigs(angularEslint.configs.templateRecommended);
const angularTemplateAccessibilityRules = rulesFromConfigs(
  angularEslint.configs.templateAccessibility,
);

const applicationLayerRelativeImports = [
  '../application/*',
  '../../application/*',
  '../../../application/*',
  '../../../../application/*',
];
const domainLayerRelativeImports = [
  '../domain/*',
  '../../domain/*',
  '../../../domain/*',
  '../../../../domain/*',
];
const infrastructureLayerRelativeImports = [
  '../infrastructure/*',
  '../../infrastructure/*',
  '../../../infrastructure/*',
  '../../../../infrastructure/*',
];
const presentationLayerRelativeImports = [
  '../presentation/*',
  '../../presentation/*',
  '../../../presentation/*',
  '../../../../presentation/*',
];

const fileSizeBudget = (max) => [
  'error',
  {
    max,
    skipBlankLines: true,
    skipComments: true,
  },
];

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
      ...angularRecommendedRules,
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
      complexity: ['error', { max: 10 }],
      'max-depth': ['error', { max: 4 }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', { max: 4 }],
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
    files: ['**/*.spec.ts'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },
  {
    files: ['src/app/features/*/domain/**/*.ts'],
    rules: {
      'max-lines': fileSizeBudget(180),
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@angular/*',
                '@capacitor/*',
                '@env/*',
                '@features/*',
                '@ionic/*',
                'ionicons',
                'ionicons/*',
                ...applicationLayerRelativeImports,
                ...infrastructureLayerRelativeImports,
                ...presentationLayerRelativeImports,
              ],
              message:
                'Domain code must stay pure TypeScript and must not depend on Angular, Ionic, Capacitor, environment, application, infrastructure, or presentation code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/features/*/application/**/*.ts'],
    rules: {
      'max-lines': fileSizeBudget(260),
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@capacitor/*',
                '@env/*',
                '@features/*',
                '@ionic/*',
                'ionicons',
                'ionicons/*',
                ...infrastructureLayerRelativeImports,
                ...presentationLayerRelativeImports,
              ],
              message:
                'Application code may depend on domain code, but must not depend on Ionic, Capacitor, environment, infrastructure, or presentation code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/features/*/application/ports/**/*.ts'],
    rules: {
      'max-lines': fileSizeBudget(180),
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@capacitor/*',
                '@env/*',
                '@features/*',
                '@ionic/*',
                'ionicons',
                'ionicons/*',
                ...infrastructureLayerRelativeImports,
                ...presentationLayerRelativeImports,
              ],
              message:
                'Ports must describe application needs without importing infrastructure, presentation, Ionic, Capacitor, or environment code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/features/*/application/**/*.facade.ts'],
    rules: {
      'max-lines': fileSizeBudget(650),
    },
  },
  {
    files: ['src/app/features/*/application/**/*.use-case.ts'],
    rules: {
      'max-lines': fileSizeBudget(180),
    },
  },
  {
    files: [
      'src/app/features/*/presentation/pages/**/*.ts',
      'src/app/features/*/presentation/components/**/*.ts',
    ],
    rules: {
      'max-lines': fileSizeBudget(320),
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@capacitor/*',
                '@env/*',
                '@features/*',
                ...infrastructureLayerRelativeImports,
              ],
              message:
                'Presentation pages and components may call application code, but must not import Capacitor, environment, feature aliases, or infrastructure code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/features/*/presentation/*.routes.ts'],
    rules: {
      'max-lines': fileSizeBudget(120),
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
    files: ['src/app/features/*/infrastructure/**/*.ts'],
    rules: {
      'max-lines': fileSizeBudget(450),
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@env/*',
                '@features/*',
                '@ionic/*',
                'ionicons',
                'ionicons/*',
                ...presentationLayerRelativeImports,
              ],
              message:
                'Infrastructure code may implement application ports, but must not depend on presentation, Ionic, feature aliases, or environment imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    ignores: ['src/app/core/config/**'],
    rules: {
      'max-lines': fileSizeBudget(260),
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@capacitor/*',
                '@env/*',
                '@features/*',
                '@ionic/*',
                'ionicons',
                'ionicons/*',
              ],
              message:
                'Core is app-wide wiring and must not depend on feature, Ionic, Capacitor, or environment imports unless a narrower override allows it.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/shared/domain/**/*.ts'],
    rules: {
      'max-lines': fileSizeBudget(180),
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@angular/*',
                '@capacitor/*',
                '@env/*',
                '@features/*',
                '@ionic/*',
                'ionicons',
                'ionicons/*',
              ],
              message:
                'Shared domain code must stay pure TypeScript and must not depend on Angular, Ionic, Capacitor, environment, or feature code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/shared/application/**/*.ts'],
    rules: {
      'max-lines': fileSizeBudget(260),
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@capacitor/*',
                '@env/*',
                '@features/*',
                '@ionic/*',
                'ionicons',
                'ionicons/*',
              ],
              message:
                'Shared application code must not depend on Ionic, Capacitor, environment, or feature code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/shared/presentation/**/*.ts'],
    rules: {
      'max-lines': fileSizeBudget(320),
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@capacitor/*', '@env/*', '@features/*'],
              message:
                'Shared presentation code may use UI dependencies, but must not depend on Capacitor, environment, or feature code.',
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
    files: ['**/*.spec.ts'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
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
      ...angularTemplateRecommendedRules,
      ...angularTemplateAccessibilityRules,
    },
  },
];
