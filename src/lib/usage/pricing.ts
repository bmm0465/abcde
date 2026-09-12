/**
 * 모델 단가표 — 사용량 한도 계산용 추정값.
 * 실제 청구는 각 제공자 대시보드가 정본이다. 분기마다 한 번 맞춰 본다.
 * 단위: 토큰 모델은 USD / 1M tokens, 그 외는 아래 UNIT_PRICES 참고.
 * 기준일: 2026-09
 */

export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1': { input: 2, output: 8 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  'gpt-5': { input: 1.25, output: 10 },
  'gpt-5-mini': { input: 0.25, output: 2 },
  'gpt-5-nano': { input: 0.05, output: 0.4 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  // Google
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  // Anthropic
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
}

/** 토큰이 아닌 단위로 과금되는 모델. unit 은 분(min) 또는 문자(char). */
export const UNIT_PRICES: Record<string, { unit: 'minute' | 'char'; price: number }> = {
  'whisper-1': { unit: 'minute', price: 0.006 },
  'gpt-4o-transcribe': { unit: 'minute', price: 0.006 },
  'gpt-4o-mini-transcribe': { unit: 'minute', price: 0.003 },
  'tts-1': { unit: 'char', price: 15 / 1_000_000 },
  'tts-1-hd': { unit: 'char', price: 30 / 1_000_000 },
  'gpt-4o-mini-tts': { unit: 'char', price: 0.6 / 1_000_000 },
}

/** 모르는 모델은 비싸게 잡는다 — 한도를 뚫는 쪽보다 낫다. */
export const FALLBACK_PRICE = { input: 5, output: 15 }

export interface UsageInput {
  model: string
  tokensIn?: number
  tokensOut?: number
  /** 분 또는 문자 수. UNIT_PRICES 모델에서만 쓴다. */
  units?: number
}

export function estimateCostUsd({ model, tokensIn = 0, tokensOut = 0, units = 0 }: UsageInput): number {
  const unitPrice = UNIT_PRICES[model]
  if (unitPrice) return round6(units * unitPrice.price)

  // 날짜 접미사(gpt-4o-2024-08-06) 를 떼고 찾는다.
  const base = model.replace(/-\d{4}-\d{2}-\d{2}$/, '')
  const price = MODEL_PRICES[model] ?? MODEL_PRICES[base] ?? FALLBACK_PRICE
  return round6((tokensIn * price.input + tokensOut * price.output) / 1_000_000)
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000
}

export function formatUsd(n: number): string {
  if (n === 0) return '$0.00'
  if (n < 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(2)}`
}
