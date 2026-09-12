import { expect, test } from '@playwright/test'

test.describe('공개 화면', () => {
  test('첫 화면', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.status()).toBe(200)
    await expect(page).toHaveTitle(/ABCDE Projects/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('데이터로 그리는 더 나은 교실')
    await expect(page.getByRole('link', { name: '프로젝트 보기' })).toBeVisible()
  })

  test('프로젝트 목록과 상세', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByText('AIDAPEL', { exact: true })).toBeVisible()
    await expect(page.getByText('AIEEWA', { exact: true })).toBeVisible()

    await page.goto('/projects/aidapel')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('AIDAPEL')
    await expect(page.getByText('이식하는 중')).toBeVisible()
  })

  test('기록 목록과 본문', async ({ page }) => {
    await page.goto('/notes')
    await expect(page.getByText('급식 잔반 데이터로 우리 반 식습관 분석하기')).toBeVisible()

    await page.goto('/notes/lunch-leftover-analysis')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('급식 잔반')
    await expect(page.getByRole('heading', { name: /문제 정의/ })).toBeVisible()
  })

  test('없는 화면은 404', async ({ page }) => {
    const res = await page.goto('/no-such-page')
    expect(res?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('그런 화면이 없습니다')
  })
})

test.describe('인증', () => {
  test('로그인 화면', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('이메일')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible()
  })

  test('보호 경로는 로그인으로 보낸다', async ({ page }) => {
    for (const path of ['/admin', '/account', '/aieewa', '/aieewa/generate']) {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`))
    }
  })
})

test.describe('AIEEWA', () => {
  test('소개는 공개, 사용은 로그인', async ({ page }) => {
    await page.goto('/projects/aieewa')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('AIEEWA')
    await expect(page.getByRole('link', { name: '로그인하고 사용' })).toBeVisible()
  })

  test('API 는 로그인 없이 거절한다', async ({ request }) => {
    for (const path of ['/api/aieewa/generate', '/api/aieewa/score']) {
      const res = await request.post(path, { data: {} })
      expect(res.status()).toBe(401)
      expect((await res.json()).code).toBe('unauthenticated')
    }
  })
})

test.describe('보안 헤더', () => {
  test('CSP · nosniff · frame 차단', async ({ request }) => {
    const res = await request.get('/')
    const csp = res.headers()['content-security-policy'] ?? ''
    expect(csp).toContain("script-src 'self' 'nonce-")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })
})
