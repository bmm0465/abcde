import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { generateQuestion } from '@/apps/aieewa/generate'
import { MissingApiKeyError, UsageMeter } from '@/apps/aieewa/openai'
import { apiError, guardLlmRequest } from '@/lib/api/authorize'
import { ndjsonStream } from '@/lib/api/stream'
import { recordUsage } from '@/lib/usage'

// Vercel Hobby 의 함수 실행 상한이 60초다. Pro 라면 300 까지 올릴 수 있다.
export const maxDuration = 60

const schema = z.object({
  request: z.string().trim().min(10, '요청을 10자 이상 적어 주세요.').max(2_000, '요청은 2000자까지입니다.'),
})

export async function POST(req: NextRequest) {
  const auth = await guardLlmRequest('aieewa', '/api/aieewa/generate')
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError(400, '요청 형식이 올바르지 않습니다.', 'bad_request')
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return apiError(400, parsed.error.issues[0]?.message ?? '요청을 확인해 주세요.', 'bad_request')
  }

  const { viewer } = auth
  const meter = new UsageMeter()

  return ndjsonStream(async ({ step, done, fail }) => {
    try {
      const result = await generateQuestion({
        supabase: viewer.supabase,
        ownerId: viewer.user.id,
        request: parsed.data.request,
        meter,
        onStep: step,
      })
      done({
        id: result.question.id,
        gradeUnit: result.question.grade_unit,
        groundingScore: result.groundingScore,
        contextChunks: result.chunks.length,
      })
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        fail(err.message, 'missing_api_key')
        return
      }
      // 자세한 원인은 서버 로그로. 화면에는 사용자가 할 수 있는 말만 보낸다.
      console.error('[aieewa] 문항 생성 실패:', err instanceof Error ? err.message : err)
      fail(err instanceof Error ? err.message : '문항 생성에 실패했습니다.', 'generate_failed')
    } finally {
      // 도중에 실패했어도 그때까지 쓴 토큰은 이미 나갔다. 반드시 기록한다.
      for (const usage of meter.entries()) {
        await recordUsage({ ...usage, userId: viewer.user.id, appSlug: 'aieewa', provider: 'openai', kind: 'chat' })
      }
    }
  })
}
