import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // 공통 ignore
  {
    ignores: ['dist', 'node_modules']
  },

  // JS 기본 추천 설정
  js.configs.recommended,

  // TS + 타입체크 포함 추천 설정
  ...tseslint.configs.recommendedTypeChecked,

  // 우리 프로젝트용 커스터마이즈
  {
    files: ['src/*/.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      'max-len': [
        'error',
        {
          code: 100,
          ignoreComments: true,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true
        }
      ],
      '@typescript-eslint/no-unused-vars': 'warn'
    }
  }
);