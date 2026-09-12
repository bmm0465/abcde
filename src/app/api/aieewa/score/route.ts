import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { MissingApiKeyError, UsageMeter } from '@/apps/aieewa/openai'
import { scoreAnswer } from '@/apps/aieewa/score'
import { SCORE_MODES, type QuestionRow } from '@/apps/aieewa/types'
import { apiError, guardLlmRequest } from '@/lib/api/authorize'
import { ndjsonStream } from '@/lib/api/stream'
import { recordUsage } from '@/lib/usage'

export const maxDuration = 60

const schema = z.object({
  questionId: z.uuid(),
  studentLabel: z.string().trim().min(1, '학생 표시를 적어 주세요.').max(40),
  answer: z.string().trim().min(1, '답안을 붙여 넣어 주세요.').max(4_000, '답안은 4000자까지입니다.'),
  mode: z.enum(SCORE_MODES),
})

export async function POST(req: NextRequest) {
  const auth = await guardLlmRequest('aieewa', '/api/aieewa/score')
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

  // 사용자 세션으로 읽는다 → 남의 문항 id 를 넣어도 RLS 가 막는다.
  const { data: question, error } = await viewer.supabase
    .from('aieewa_questions')
    .select('*')
    .eq('id', parsed.data.questionId)
    .maybeSingle()

  if (error) return apiError(500, '문항을 불러오지 못했습니다.', 'question_load_failed')
  if (!question) return apiError(404, '문항을 찾을 수 없습니다.', 'question_not_found')

  const meter = new UsageMeter()

  return ndjsonStream(async ({ step, done, fail }) => {
    try {
      const result = await scoreAnswer({
        supabase: viewer.supabase,
        ownerId: viewer.user.id,
        question: question as QuestionRow,
        studentLabel: parsed.data.studentLabel,
        answer: parsed.data.answer,
        mode: parsed.data.mode,
        meter,
        onStep: step,
      })
      done({
        id: result.answer.id,
        totalScore: result.answer.total_score,
        holistic: result.answer.holistic,
        accuracyScore: result.accuracyScore,
        feedbackScore: result.feedbackScore,
      })
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        fail(err.message, 'missing_api_key')
        return
      }
      console.error('[aieewa] 채점 실패:', err instanceof Error ? err.message : err)
      fail(err instanceof Error ? err.message : '채점에 실패했습니다.', 'score_failed')
    } finally {
      for (const usage of meter.entries()) {
        await recordUsage({ ...usage, userId: viewer.user.id, appSlug: 'aieewa', provider: 'openai', kind: 'chat' })
      }
    }
  })
}
