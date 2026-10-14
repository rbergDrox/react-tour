import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import typescript from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            'storybook-static/**',
            'test-results/**',
            'playwright-report/**',
        ],
    },
    js.configs.recommended,
    ...typescript.configs.recommended,
    reactHooks.configs.flat['recommended-latest'],
    {
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
            ],
        },
    },
    {
        files: ['*.config.{js,ts}', 'examples/**/server.js', 'e2e/**'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    prettier,
];
