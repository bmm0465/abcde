import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * 디자인 시스템 방어선 (docs/03-디자인-시스템.md).
 * 문서에 적어 두는 것만으로는 지켜지지 않는다. 린트가 막는다.
 */
const BANNED = [
  {
    selector:
      'Literal[value=/(bg|from|to|via|text|border)-(purple|fuchsia|violet|pink|cyan|indigo|rose|zinc|slate|gray|neutral|stone|blue|green|red|yellow|orange|amber|lime|emerald|teal|sky)-/]',
    message: '디자인 토큰 밖의 색을 쓰지 않는다. globals.css 의 @theme 을 사용할 것.',
  },
  {
    selector: 'Literal[value=/rounded-(2xl|3xl|xl)/]',
    message: '모서리는 rounded-sm(3) / rounded-md(5) / rounded-lg(8) 뿐이다.',
  },
  {
    selector: 'Literal[value=/shadow-(sm|md|lg|xl|2xl)/]',
    message: '정적 요소에 그림자를 쓰지 않는다. shadow-pop / shadow-modal 만 존재한다.',
  },
  {
    selector: 'Literal[value=/backdrop-blur/]',
    message: '글래스모피즘 금지.',
  },
  {
    selector: 'Literal[value=/bg-gradient-|bg-linear-/]',
    message: '그라데이션 금지. 예외 없음.',
  },
  {
    selector: 'Literal[value=/animate-(bounce|pulse|ping|spin)/]',
    message: '장식적 애니메이션 금지. 스켈레톤 shimmer 도 금지.',
  },
]

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // 허브 셸과 공용 부품에는 규칙을 강제한다.
    // 이식된 레거시 앱(src/apps/**)은 1차에서 동작을 보존하고 2차에서 정리한다.
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    ignores: ['src/app/(apps)/**'],
    rules: {
      'no-restricted-syntax': ['error', ...BANNED],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**']),
])

export default eslintConfig
