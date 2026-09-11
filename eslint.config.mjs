import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'android/**/build/**',
      'android/app/src/main/assets/**',
      'public/vendor/**',
      '谷布谷移动应用设计/**',
    ],
  },
];

export default eslintConfig;
