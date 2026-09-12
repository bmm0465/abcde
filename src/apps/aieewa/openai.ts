import 'server-only'

import OpenAI from 'openai'
import type { z } from 'zod'
import type { UsageInput } from '@/lib/usage/pricing'

/**
 * OpenAI 호출 한 겹. 원본 AIEEWA 의 LangChain 체인을 대신한다.
 *
 * LangChain 을 걷어낸 이유는 셋이다.
 * 1. 원본은 응답 문자열에서 정규식 세 개로 JSON 을 긁어내고 실패하면 다시 긁었다.
 *    구조화 출력(json_schema, strict)을 쓰면 그 단계가 통째로 사라진다.
 * 2. 프롬프트 템플릿의 중괄호가 예시 JSON 과 충돌해 원본은 결국 템플릿을 버리고
 *    문자열을 직접 이어 붙이고 있었다. 그러면 템플릿 엔진이 있을 이유가 없다.
 * 3. 토큰 사용량을 알아야 한다. 사용량 기록 없이는 월 한도를 걸 수 없다.
 */

export const DEFAULT_MODEL = process.env.AIEEWA_MODEL ?? 'gpt-4o'
export const DEFAULT_EMBEDDING_MODEL = process.env.AIEEWA_EMBEDDING_MODEL ?? 'text-embedding-3-small'

export class MissingApiKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY 가 설정되지 않았습니다. 관리자에게 문의하세요.')
    this.name = 'MissingApiKeyError'
  }
}

export function createOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new MissingApiKeyError()
  // 화면이 60초 안에 끝나야 하므로 SDK 기본 재시도(2회)를 1회로 줄인다.
  return new OpenAI({ apiKey, maxRetries: 1, timeout: 120_000 })
}

/**
 * 한 요청 동안의 토큰 사용을 모델별로 모은다.
 * 호출마다 DB 에 쓰면 한 번 생성에 열 줄이 남는다. 끝에서 모델별로 한 줄씩 쓴다.
 */
export class UsageMeter {
  private readonly totals = new Map<string, { tokensIn: number; tokensOut: number }>()

  add(model: string, tokensIn: number, tokensOut: number): void {
    const prev = this.totals.get(model) ?? { tokensIn: 0, tokensOut: 0 }
    this.totals.set(model, { tokensIn: prev.tokensIn + tokensIn, tokensOut: prev.tokensOut + tokensOut })
  }

  entries(): UsageInput[] {
    return [...this.totals].map(([model, t]) => ({ model, tokensIn: t.tokensIn, tokensOut: t.tokensOut }))
  }

  get isEmpty(): boolean {
    return this.totals.size === 0
  }
}

export interface ChatOptions<T> {
  system: string
  user: string
  schema: z.ZodType<T>
  jsonSchema: Record<string, unknown>
  /** 구조화 출력 이름. a-z, 0-9, _, - 만 쓴다. */
  schemaName: string
  temperature?: number
  model?: string
  meter: UsageMeter
}

/**
 * 구조화 출력을 강제하는 한 번의 대화. 스키마에 맞지 않으면 던진다.
 * 모델이 길이 제한이나 안전 필터로 끊기면 refusal/finish_reason 으로 알 수 있다.
 */
export async function chatJson<T>(client: OpenAI, opts: ChatOptions<T>): Promise<T> {
  const model = opts.model ?? DEFAULT_MODEL

  const completion = await client.chat.completions.create({
    model,
    temperature: opts.temperature ?? 0.3,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: opts.schemaName, strict: true, schema: opts.jsonSchema },
    },
  })

  const usage = completion.usage
  if (usage) opts.meter.add(model, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0)

  const choice = completion.choices[0]
  if (choice?.message.refusal) {
    throw new Error(`모델이 응답을 거부했습니다: ${choice.message.refusal}`)
  }
  if (choice?.finish_reason === 'length') {
    throw new Error('모델의 응답이 길이 제한에 걸려 잘렸습니다. 요청을 짧게 나눠 주세요.')
  }

  const content = choice?.message.content
  if (!content) throw new Error('모델이 빈 응답을 반환했습니다.')

  // strict 구조화 출력이라 여기서 JSON.parse 가 실패할 일은 사실상 없다.
  // 그래도 실패하면 원문을 로그에 남기지 않는다 — 학생 답안이 섞여 있을 수 있다.
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('모델 응답을 JSON 으로 읽지 못했습니다.')
  }

  const result = opts.schema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`모델 응답이 형식에 맞지 않습니다: ${result.error.issues[0]?.message ?? '알 수 없음'}`)
  }
  return result.data
}

/** 짧은 평문 한 덩이. 요청 재작성처럼 구조가 필요 없는 곳에만 쓴다. */
export async function chatText(
  client: OpenAI,
  opts: { system: string; user: string; meter: UsageMeter; maxTokens?: number; model?: string },
): Promise<string> {
  const model = opts.model ?? DEFAULT_MODEL
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_completion_tokens: opts.maxTokens ?? 600,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
  })
  const usage = completion.usage
  if (usage) opts.meter.add(model, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0)
  return completion.choices[0]?.message.content?.trim() ?? ''
}

/** 한 문장을 벡터로. 검색 질의에만 쓴다(코퍼스 적재는 시드 스크립트가 한다). */
export async function embedQuery(client: OpenAI, text: string, meter: UsageMeter): Promise<number[]> {
  const model = DEFAULT_EMBEDDING_MODEL
  const res = await client.embeddings.create({ model, input: text })
  if (res.usage) meter.add(model, res.usage.prompt_tokens ?? 0, 0)
  const embedding = res.data[0]?.embedding
  if (!embedding) throw new Error('임베딩을 만들지 못했습니다.')
  return embedding
}
