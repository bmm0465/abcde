import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AQG_CONTEXT_JUDGE_SYSTEM,
  AQG_GROUNDING_JUDGE_SYSTEM,
  AQG_REWRITE_CONTEXT_SYSTEM,
  AQG_REWRITE_GROUNDING_SYSTEM,
  AQG_SYSTEM,
  aqgUser,
} from '@/apps/aieewa/prompts'
import { chatJson, chatText, createOpenAI, DEFAULT_MODEL, type UsageMeter } from '@/apps/aieewa/openai'
import { formatChunks, searchCorpus, type Chunk } from '@/apps/aieewa/rag'
import {
  generatedQuestionJsonSchema,
  generatedQuestionSchema,
  judgeJsonSchema,
  judgeSchema,
  toQuestionRow,
  type GeneratedQuestion,
  type QuestionRow,
} from '@/apps/aieewa/types'

/**
 * 문항 생성(AQG) 파이프라인.
 *
 *   검색 → 요청·문서 관련성 판단 → 생성 → 문서 기반성 판단 → 저장
 *
 * 판단이 3점 미만이면 요청을 다시 써서 한 바퀴 더 돈다(최대 2바퀴).
 * 원본과 다른 점 둘.
 * - 코퍼스가 비어 있으면 두 판단을 모두 건너뛴다. 빈 문서를 두고 관련성을 물어봐야
 *   답이 정해져 있고, 호출 두 번이 그냥 버려진다.
 * - 판단 점수를 문항에 함께 저장한다. 교사가 "이 문항이 무엇에 근거했나"를 볼 수 있어야 한다.
 */

const MAX_ROUNDS = 2
const PASS_SCORE = 3

export type StepReporter = (label: string) => void

export interface GenerateResult {
  question: QuestionRow
  groundingScore: number | null
  chunks: Chunk[]
}

export async function generateQuestion(opts: {
  supabase: SupabaseClient
  ownerId: string
  request: string
  meter: UsageMeter
  onStep: StepReporter
}): Promise<GenerateResult> {
  const { supabase, ownerId, meter, onStep } = opts
  const client = createOpenAI()

  let request = opts.request
  let chunks: Chunk[] = []
  let groundingScore: number | null = null
  let generated: GeneratedQuestion | null = null

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    onStep(round === 1 ? '참고 문서 검색 중' : '요청을 다시 쓰고 검색 중')
    chunks = await searchCorpus(supabase, client, request, meter)
    const context = formatChunks(chunks)

    // 코퍼스가 있을 때만 요청·문서 관련성을 따진다.
    if (chunks.length > 0 && round < MAX_ROUNDS) {
      onStep('검색 결과가 요청에 맞는지 확인 중')
      const verdict = await chatJson(client, {
        system: AQG_CONTEXT_JUDGE_SYSTEM,
        user: `요청: ${request}\n\n검색된 문서:\n${context}`,
        schema: judgeSchema,
        jsonSchema: judgeJsonSchema,
        schemaName: 'relevance_verdict',
        temperature: 0,
        meter,
      })
      if (verdict.score < PASS_SCORE) {
        onStep('검색 결과가 요청과 멀어 요청을 다시 씁니다')
        request = (await chatText(client, { system: AQG_REWRITE_CONTEXT_SYSTEM, user: `요청: ${request}`, meter })) || request
        continue
      }
    }

    onStep('문항과 채점 기준 생성 중')
    generated = await chatJson(client, {
      system: AQG_SYSTEM,
      user: aqgUser(request, context),
      schema: generatedQuestionSchema,
      jsonSchema: generatedQuestionJsonSchema as unknown as Record<string, unknown>,
      schemaName: 'assessment_item',
      temperature: 0.3,
      meter,
    })

    // 참고할 문서가 없었다면 기반성을 물을 대상도 없다.
    if (chunks.length === 0) break

    onStep('생성 결과가 문서에 근거했는지 확인 중')
    const grounding = await chatJson(client, {
      system: AQG_GROUNDING_JUDGE_SYSTEM,
      user: `검색된 문서:\n${context}\n\n생성된 평가 문항과 채점 기준:\n${JSON.stringify(generated, null, 2)}`,
      schema: judgeSchema,
      jsonSchema: judgeJsonSchema,
      schemaName: 'grounding_verdict',
      temperature: 0,
      meter,
    })
    groundingScore = grounding.score

    if (grounding.score >= PASS_SCORE || round === MAX_ROUNDS) break

    onStep('문서 기반성이 낮아 요청을 다시 씁니다')
    request = (await chatText(client, { system: AQG_REWRITE_GROUNDING_SYSTEM, user: `요청: ${request}`, meter })) || request
  }

  if (!generated) throw new Error('문항을 생성하지 못했습니다. 요청을 조금 더 구체적으로 적어 주세요.')

  onStep('저장 중')
  const row = toQuestionRow(generated, {
    ownerId,
    // 다시 쓴 요청이 아니라 교사가 실제로 넣은 원문을 남긴다.
    request: opts.request,
    model: DEFAULT_MODEL,
    groundingScore,
    contextChunks: chunks.length,
  })

  const { data, error } = await supabase.from('aieewa_questions').insert(row).select().single()
  if (error) throw new Error(`문항을 저장하지 못했습니다: ${error.message}`)

  return { question: data as QuestionRow, groundingScore, chunks }
}
