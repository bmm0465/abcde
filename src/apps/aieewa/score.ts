import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { chatJson, chatText, createOpenAI, DEFAULT_MODEL, type UsageMeter } from '@/apps/aieewa/openai'
import {
  SCORE_AAS_SYSTEM,
  SCORE_ACCURACY_JUDGE_SYSTEM,
  SCORE_FEEDBACK_JUDGE_SYSTEM,
  SCORE_REWRITE_ACCURACY_SYSTEM,
  SCORE_REWRITE_FEEDBACK_SYSTEM,
  SCORE_STANDARD_SYSTEM,
  scoreUser,
} from '@/apps/aieewa/prompts'
import type { StepReporter } from '@/apps/aieewa/generate'
import {
  judgeJsonSchema,
  judgeSchema,
  scoredAnswerJsonSchema,
  scoredAnswerSchema,
  toAnswerRow,
  type AnswerRow,
  type QuestionRow,
  type ScoreMode,
  type ScoredAnswer,
} from '@/apps/aieewa/types'

/**
 * 답안 채점.
 *
 * standard: 문항의 채점 기준으로 한 번 채점한다. 빠르고 싸다.
 * aas:      교사 채점 예시를 few-shot 으로 넣고 채점한 뒤, 채점 정확성과 피드백 품질을
 *           스스로 매긴다. 3점 미만이면 지시를 보강해 다시 채점한다(최대 3바퀴).
 *
 * 두 모드의 차이는 "근거를 남기고 스스로 검증하느냐"다. 화면에서 그렇게 설명한다.
 * 어느 쪽이든 결과는 교사가 검토할 대상이지 확정된 점수가 아니다.
 */

const MAX_ROUNDS = 3
const PASS_SCORE = 3

export interface ScoreResult {
  answer: AnswerRow
  accuracyScore: number | null
  feedbackScore: number | null
}

export async function scoreAnswer(opts: {
  supabase: SupabaseClient
  ownerId: string
  question: QuestionRow
  studentLabel: string
  answer: string
  mode: ScoreMode
  meter: UsageMeter
  onStep: StepReporter
}): Promise<ScoreResult> {
  const { supabase, ownerId, question, studentLabel, answer, mode, meter, onStep } = opts
  const client = createOpenAI()

  const system = mode === 'aas' ? SCORE_AAS_SYSTEM : SCORE_STANDARD_SYSTEM
  const baseArgs = {
    gradeUnit: question.grade_unit,
    passage: question.passage,
    prompt: question.prompt,
    conditions: question.conditions,
    analyticCriteria: question.analytic_criteria,
    holisticCriteria: question.holistic_criteria,
    levelAnswers: question.level_answers,
    studentLabel,
    answer,
  }

  let extraInstruction: string | undefined
  let scored: ScoredAnswer | null = null
  let accuracyScore: number | null = null
  let feedbackScore: number | null = null

  const rounds = mode === 'aas' ? MAX_ROUNDS : 1

  for (let round = 1; round <= rounds; round++) {
    onStep(round === 1 ? '답안 채점 중' : `다시 채점 중 (${round}번째)`)
    scored = await chatJson(client, {
      system,
      user: scoreUser({ ...baseArgs, extraInstruction }),
      schema: scoredAnswerSchema,
      jsonSchema: scoredAnswerJsonSchema as unknown as Record<string, unknown>,
      schemaName: 'answer_score',
      temperature: 0,
      meter,
    })

    if (mode !== 'aas') break

    const criteriaText = question.analytic_criteria.join('\n\n')

    onStep('채점이 기준에 맞는지 확인 중')
    const accuracy = await chatJson(client, {
      system: SCORE_ACCURACY_JUDGE_SYSTEM,
      user: `채점 기준:\n${criteriaText}\n\n채점 결과:\n${JSON.stringify(scored, null, 2)}`,
      schema: judgeSchema,
      jsonSchema: judgeJsonSchema,
      schemaName: 'accuracy_verdict',
      temperature: 0,
      meter,
    })
    accuracyScore = accuracy.score

    if (accuracy.score < PASS_SCORE && round < rounds) {
      onStep('채점이 기준과 어긋나 지시를 보강합니다')
      extraInstruction = await chatText(client, {
        system: SCORE_REWRITE_ACCURACY_SYSTEM,
        user: `채점 기준:\n${criteriaText}\n\n낮게 평가된 이유: ${accuracy.reason}`,
        meter,
      })
      continue
    }

    onStep('피드백 품질 확인 중')
    const feedback = await chatJson(client, {
      system: SCORE_FEEDBACK_JUDGE_SYSTEM,
      user: `채점 및 피드백 생성 결과:\n${JSON.stringify(scored, null, 2)}`,
      schema: judgeSchema,
      jsonSchema: judgeJsonSchema,
      schemaName: 'feedback_verdict',
      temperature: 0,
      meter,
    })
    feedbackScore = feedback.score

    if (feedback.score >= PASS_SCORE || round === rounds) break

    onStep('피드백이 미흡해 지시를 보강합니다')
    extraInstruction = await chatText(client, {
      system: SCORE_REWRITE_FEEDBACK_SYSTEM,
      user: `낮게 평가된 이유: ${feedback.reason}`,
      meter,
    })
  }

  if (!scored) throw new Error('채점을 완료하지 못했습니다.')

  onStep('저장 중')
  const row = toAnswerRow(scored, {
    questionId: question.id,
    ownerId,
    studentLabel,
    answer,
    mode,
    model: DEFAULT_MODEL,
    accuracyScore,
    feedbackScore,
  })

  const { data, error } = await supabase.from('aieewa_answers').insert(row).select().single()
  if (error) throw new Error(`채점 결과를 저장하지 못했습니다: ${error.message}`)

  return { answer: data as AnswerRow, accuracyScore, feedbackScore }
}
