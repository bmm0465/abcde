import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type OpenAI from 'openai'
import { embedQuery, type UsageMeter } from '@/apps/aieewa/openai'

/**
 * 코퍼스 검색. 벡터 검색을 먼저 하고, 실패하거나 빈손이면 키워드로 받친다.
 *
 * 사용자 세션의 Supabase 클라이언트를 받는다 → RLS 가 그대로 걸린다.
 * 공용 코퍼스와 본인 문서만 검색된다.
 */

export interface Chunk {
  content: string
  title: string
  score: number
  via: 'vector' | 'keyword'
}

const MAX_CHUNKS = 8
/** 한 청크가 아무리 길어도 프롬프트에 이만큼만 넣는다. 컨텍스트 폭주 방지. */
const MAX_CHUNK_CHARS = 1_800

export async function searchCorpus(
  supabase: SupabaseClient,
  client: OpenAI,
  query: string,
  meter: UsageMeter,
): Promise<Chunk[]> {
  const [vector, keyword] = await Promise.all([
    vectorSearch(supabase, client, query, meter),
    keywordSearch(supabase, query),
  ])

  // 벡터 결과를 앞에 두고, 같은 본문은 한 번만 남긴다.
  const seen = new Set<string>()
  const merged: Chunk[] = []
  for (const chunk of [...vector, ...keyword]) {
    const key = chunk.content.slice(0, 200)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(chunk)
    if (merged.length >= MAX_CHUNKS) break
  }
  return merged
}

async function vectorSearch(
  supabase: SupabaseClient,
  client: OpenAI,
  query: string,
  meter: UsageMeter,
): Promise<Chunk[]> {
  try {
    const embedding = await embedQuery(client, query, meter)
    const { data, error } = await supabase.rpc('aieewa_match_chunks', {
      query_embedding: embedding,
      match_count: MAX_CHUNKS,
    })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: { content: string; document_title: string; similarity: number }) => ({
      content: row.content,
      title: row.document_title,
      score: Number(row.similarity),
      via: 'vector' as const,
    }))
  } catch (err) {
    // 코퍼스가 비었거나 임베딩이 실패해도 생성 자체는 계속된다.
    console.warn('[aieewa] 벡터 검색 실패, 키워드로 대체:', err instanceof Error ? err.message : err)
    return []
  }
}

async function keywordSearch(supabase: SupabaseClient, query: string): Promise<Chunk[]> {
  // 두 글자 이상의 낱말만 쓰고, PostgREST 의 or 필터를 깨뜨리는 문자는 버린다.
  const words = query
    .split(/\s+/)
    .map((w) => w.replace(/[,.()%*"'\\]/g, '').trim())
    .filter((w) => w.length >= 2)
    .slice(0, 6)
  if (words.length === 0) return []

  const filter = words.map((w) => `content.ilike.%${w}%`).join(',')
  const { data, error } = await supabase
    .from('aieewa_document_chunks')
    .select('content, aieewa_documents!inner(title)')
    .or(filter)
    .limit(15)

  if (error) {
    console.warn('[aieewa] 키워드 검색 실패:', error.message)
    return []
  }

  type Row = { content: string; aieewa_documents: { title: string } | { title: string }[] | null }
  return (data as Row[] | null ?? [])
    .map((row) => {
      const joined = Array.isArray(row.aieewa_documents) ? row.aieewa_documents[0] : row.aieewa_documents
      return {
        content: row.content,
        title: joined?.title ?? '문서',
        score: keywordScore(row.content, words),
        via: 'keyword' as const,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CHUNKS)
}

/** 낱말이 몇 개나 들어 있는지. 짧거나 지나치게 긴 청크는 깎는다. */
function keywordScore(text: string, words: string[]): number {
  const lower = text.toLowerCase()
  let score = words.reduce((sum, w) => (lower.includes(w.toLowerCase()) ? sum + 2 : sum), 0)
  if (text.length < 50) score -= 1
  if (text.length > 2_000) score -= 1
  return score
}

/** 프롬프트에 넣을 형태로. 출처와 관련성을 함께 적어 모델이 무게를 가늠하게 한다. */
export function formatChunks(chunks: Chunk[]): string {
  return chunks
    .map((chunk, i) => {
      const body = chunk.content.length > MAX_CHUNK_CHARS
        ? `${chunk.content.slice(0, MAX_CHUNK_CHARS)}…`
        : chunk.content
      return `[문서 ${i + 1}] 출처: ${chunk.title} · 관련성: ${chunk.score.toFixed(2)} (${chunk.via})\n${body}`
    })
    .join('\n\n')
}

/** 화면에 "참고 문서 N개" 를 보여 주기 위한 수. 실패해도 0 을 돌려준다. */
export async function corpusSize(supabase: SupabaseClient): Promise<{ documents: number; chunks: number }> {
  const [docs, chunks] = await Promise.all([
    supabase.from('aieewa_documents').select('id', { count: 'exact', head: true }),
    supabase.from('aieewa_document_chunks').select('id', { count: 'exact', head: true }),
  ])
  return { documents: docs.count ?? 0, chunks: chunks.count ?? 0 }
}
