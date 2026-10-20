import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Physical-direction style keys break RTL; use start/end instead (docs/PLAN.md §4).
const physicalDirectionKeys =
  '^(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)$';

// Pure packages must run in Node with no React Native or Expo (docs/PLAN.md §3).
const pureImportBan = {
  patterns: [
    {
      group: [
        'react',
        'react-*',
        'react/*',
        'react-native',
        'react-native-*',
        'expo',
        'expo-*',
        '@expo/*',
        '@react-native/*',
      ],
      message: 'Pure packages must not import React, React Native or Expo.',
    },
  ],
};

export const configs = tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.expo/**',
      'apps/*/android/**',
      'apps/*/ios/**',
      '**/expo-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    // Expo config plugins, babel and metro configs are CommonJS.
    files: ['**/*.{js,cjs}'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/ui-ar/**/*.{ts,tsx}'],
    rules: {
      // require() is how React Native loads bundled assets (fonts, images).
      '@typescript-eslint/no-require-imports': ['error', { allow: ['\\.(ttf|otf|png|jpg|webp)$'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: `Property[key.name=/${physicalDirectionKeys}/]`,
          message: 'Use start/end (marginStart, paddingEnd, …) instead of left/right.',
        },
        {
          selector: "Property[key.name='textAlign'][value.value=/^(left|right)$/]",
          message: "Use textAlign 'auto' or omit it; left/right doesn't flip in RTL.",
        },
      ],
    },
  },
  {
    // Tests deliberately build malformed data.
    files: ['**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: [
      'packages/eg-electricity-tariff/**/*.ts',
      'packages/energy-model/**/*.ts',
      'packages/e2e-sync/**/*.ts',
    ],
    rules: { 'no-restricted-imports': ['error', pureImportBan] },
  },
);
