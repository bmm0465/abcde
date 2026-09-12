import { z } from 'zod'

/**
 * AIEEWA 의 자료 형태.
 *
 * LLM 에게 받는 JSON 의 키는 원본(aieewa 저장소)의 한글 이름을 그대로 둔다.
 * 프롬프트의 few-shot 예시가 그 이름으로 쓰여 있어 바꾸면 예시를 전부 다시 써야 하고,
 * 무엇보다 한글 키가 모델에게 항목의 뜻을 알려 준다. DB 컬럼 이름은 영문이고,
 * 둘 사이의 변환은 이 파일 아래쪽의 toQuestionRow / toAnswerRow 가 맡는다.
 */

// ── 문항 생성(AQG) ──────────────────────────────────────────

export const generatedQuestionSchema = z.object({
  단원_및_학년: z.string().min(1),
  예시문: z.string().min(1),
  평가문항: z.string().min(1),
  조건: z.string().min(1),
  모범_답안_1: z.string().min(1),
  모범_답안_2: z.string().min(1),
  분석적_채점_기준_1: z.string().min(1),
  분석적_채점_기준_2: z.string().min(1),
  분석적_채점_기준_3: z.string().min(1),
  총체적_채점_기준_A: z.string().min(1),
  총체적_채점_기준_B: z.string().min(1),
  총체적_채점_기준_C: z.string().min(1),
  성취수준별_예시_답안_A: z.string().min(1),
  성취수준별_예시_답안_B: z.string().min(1),
  성취수준별_예시_답안_C: z.string().min(1),
  성취수준별_평가에_따른_예시_피드백_A: z.string().min(1),
  성취수준별_평가에_따른_예시_피드백_B: z.string().min(1),
  성취수준별_평가에_따른_예시_피드백_C: z.string().min(1),
})

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>

/** OpenAI 구조화 출력(strict)용 JSON Schema. 모든 키가 required 여야 하고 추가 속성은 금지다. */
export const generatedQuestionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(
    Object.keys(generatedQuestionSchema.shape).map((key) => [key, { type: 'string' }]),
  ),
  required: Object.keys(generatedQuestionSchema.shape),
} as const

// ── 답안 채점(AAS) ──────────────────────────────────────────

export const SCORE_MODES = ['standard', 'aas'] as const
export type ScoreMode = (typeof SCORE_MODES)[number]

export const SCORE_MODE_LABELS: Record<ScoreMode, string> = {
  standard: '기본 채점',
  aas: '근거 채점(AAS)',
}

export const HOLISTIC_LEVELS = ['A', 'B', 'C'] as const
export type HolisticLevel = (typeof HOLISTIC_LEVELS)[number]

export const scoredAnswerSchema = z
  .object({
    과제_수행: z.number().int().min(0).max(2),
    과제_수행_채점_근거: z.string(),
    내용_구성: z.number().int().min(0).max(2),
    내용_구성_채점_근거: z.string(),
    언어_사용_정확성: z.number().int().min(0).max(2),
    언어_사용_정확성_채점_근거: z.string(),
    총체적_채점: z.enum(HOLISTIC_LEVELS),
    피드백: z.string().min(1),
  })
  // 총점은 모델에게 받지 않고 여기서 더한다. 모델의 산수를 믿을 이유가 없다.
  .transform((v) => ({ ...v, 총점: v.과제_수행 + v.내용_구성 + v.언어_사용_정확성 }))

export type ScoredAnswer = z.infer<typeof scoredAnswerSchema>

export const scoredAnswerJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    과제_수행: { type: 'integer', minimum: 0, maximum: 2 },
    과제_수행_채점_근거: { type: 'string' },
    내용_구성: { type: 'integer', minimum: 0, maximum: 2 },
    내용_구성_채점_근거: { type: 'string' },
    언어_사용_정확성: { type: 'integer', minimum: 0, maximum: 2 },
    언어_사용_정확성_채점_근거: { type: 'string' },
    총체적_채점: { type: 'string', enum: ['A', 'B', 'C'] },
    피드백: { type: 'string' },
  },
  required: [
    '과제_수행',
    '과제_수행_채점_근거',
    '내용_구성',
    '내용_구성_채점_근거',
    '언어_사용_정확성',
    '언어_사용_정확성_채점_근거',
    '총체적_채점',
    '피드백',
  ],
} as const

// ── 자기검증(judge) ────────────────────────────────────────
// 1~4 척도. 숫자만 받으면 모델이 설명을 덧붙이다 파싱이 깨지므로 구조화 출력으로 받는다.

export const judgeSchema = z.object({
  score: z.number().int().min(1).max(4),
  reason: z.string(),
})

export type JudgeVerdict = z.infer<typeof judgeSchema>

export const judgeJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    score: { type: 'integer', minimum: 1, maximum: 4 },
    reason: { type: 'string' },
  },
  required: ['score', 'reason'],
} as const

// ── DB 행 ──────────────────────────────────────────────────

export interface QuestionRow {
  id: string
  owner_id: string
  request: string
  grade_unit: string
  passage: string
  prompt: string
  conditions: string
  model_answers: string[]
  analytic_criteria: string[]
  holistic_criteria: Record<HolisticLevel, string>
  level_answers: Record<HolisticLevel, string>
  level_feedback: Record<HolisticLevel, string>
  model: string
  grounding_score: number | null
  context_chunks: number
  created_at: string
}

export interface AnswerRow {
  id: string
  question_id: string
  owner_id: string
  student_label: string
  answer: string
  mode: ScoreMode
  score_task: number
  score_organization: number
  score_language: number
  reason_task: string | null
  reason_organization: string | null
  reason_language: string | null
  total_score: number
  holistic: HolisticLevel
  feedback: string
  teacher_feedback: string | null
  accuracy_score: number | null
  feedback_score: number | null
  model: string
  created_at: string
}

/** 분석적 채점 3영역. 화면과 프롬프트가 같은 순서·이름을 쓴다. */
export const CRITERIA_LABELS = [
  { key: 'task', label: '과제 수행', hint: '내용의 적절성 및 완성도' },
  { key: 'organization', label: '내용 구성', hint: '응집성 및 일관성' },
  { key: 'language', label: '언어 사용', hint: '어휘 및 어법의 정확성' },
] as const

/** LLM 산출물 → DB 행. 저장 직전 한 곳에서만 변환한다. */
export function toQuestionRow(
  q: GeneratedQuestion,
  meta: { ownerId: string; request: string; model: string; groundingScore: number | null; contextChunks: number },
) {
  return {
    owner_id: meta.ownerId,
    request: meta.request,
    grade_unit: q.단원_및_학년,
    passage: q.예시문,
    prompt: q.평가문항,
    conditions: q.조건,
    model_answers: [q.모범_답안_1, q.모범_답안_2],
    analytic_criteria: [q.분석적_채점_기준_1, q.분석적_채점_기준_2, q.분석적_채점_기준_3],
    holistic_criteria: { A: q.총체적_채점_기준_A, B: q.총체적_채점_기준_B, C: q.총체적_채점_기준_C },
    level_answers: {
      A: q.성취수준별_예시_답안_A,
      B: q.성취수준별_예시_답안_B,
      C: q.성취수준별_예시_답안_C,
    },
    level_feedback: {
      A: q.성취수준별_평가에_따른_예시_피드백_A,
      B: q.성취수준별_평가에_따른_예시_피드백_B,
      C: q.성취수준별_평가에_따른_예시_피드백_C,
    },
    model: meta.model,
    grounding_score: meta.groundingScore,
    context_chunks: meta.contextChunks,
  }
}

export function toAnswerRow(
  s: ScoredAnswer,
  meta: {
    questionId: string
    ownerId: string
    studentLabel: string
    answer: string
    mode: ScoreMode
    model: string
    accuracyScore: number | null
    feedbackScore: number | null
  },
) {
  const withReasons = meta.mode === 'aas'
  return {
    question_id: meta.questionId,
    owner_id: meta.ownerId,
    student_label: meta.studentLabel,
    answer: meta.answer,
    mode: meta.mode,
    score_task: s.과제_수행,
    score_organization: s.내용_구성,
    score_language: s.언어_사용_정확성,
    reason_task: withReasons ? s.과제_수행_채점_근거 : null,
    reason_organization: withReasons ? s.내용_구성_채점_근거 : null,
    reason_language: withReasons ? s.언어_사용_정확성_채점_근거 : null,
    total_score: s.총점,
    holistic: s.총체적_채점,
    feedback: s.피드백,
    accuracy_score: meta.accuracyScore,
    feedback_score: meta.feedbackScore,
    model: meta.model,
  }
}
