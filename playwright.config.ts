import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const baseURL = `http://localhost:${PORT}`

/**
 * 스모크 테스트. 로그인 없이 볼 수 있는 화면과 보호 경로의 리다이렉트, 보안 헤더를 확인한다.
 * 로컬: 개발 서버를 재사용한다. CI: 빌드된 서버를 띄운다.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    locale: 'ko-KR',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
