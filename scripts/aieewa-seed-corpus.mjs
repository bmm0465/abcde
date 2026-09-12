// AIEEWA RAG 코퍼스 적재.
//
//   npm run aieewa:seed            ./corpus 폴더를 읽는다
//   npm run aieewa:seed -- ./다른폴더
//
// .pdf / .txt / .md 를 읽어 문단으로 쪼개고 임베딩해 Supabase 에 넣는다.
// 같은 파일을 다시 넣으면 그 문서의 청크만 지우고 다시 만든다(멱등).
//
// ── 이 스크립트가 로컬 전용인 이유 ──
// 교과서·평가 자료 PDF 는 저작권이 있다. 저장소에도, 서버 파일 시스템에도 두지 않는다.
// 원본은 담당자의 컴퓨터에만 있고, 서버에는 검색에 쓸 텍스트 청크와 벡터만 올라간다.
// 그래서 업로드 화면 대신 스크립트다.

import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const CHUNK_SIZE = 1_000
const CHUNK_OVERLAP = 200
const EMBED_BATCH = 96
const EMBEDDING_MODEL = process.env.AIEEWA_EMBEDDING_MODEL ?? 'text-embedding-3-small'

const folder = resolve(process.argv[2] ?? 'corpus')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiKey = process.env.OPENAI_API_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 있어야 합니다.')
  process.exit(1)
}
if (!openaiKey) {
  console.error('OPENAI_API_KEY 가 .env.local 에 있어야 합니다.')
  process.exit(1)
}

const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const openai = new OpenAI({ apiKey: openaiKey })

/** 파일 이름으로 자료의 종류를 짐작한다. 틀리면 대시보드에서 고치면 된다. */
function guessKind(name) {
  if (/교과서|textbook/i.test(name)) return 'textbook'
  if (/성취기준|standard|교육과정/i.test(name)) return 'standard'
  if (/채점|기준|rubric|평가도구/i.test(name)) return 'rubric'
  return 'reference'
}

async function extractText(path) {
  const ext = extname(path).toLowerCase()
  if (ext === '.txt' || ext === '.md') return readFile(path, 'utf8')
  if (ext !== '.pdf') return null

  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(await readFile(path)) })
  try {
    const result = await parser.getText()
    return result.text ?? ''
  } finally {
    await parser.destroy()
  }
}

/**
 * 문장 경계를 살려 자른다. 그냥 길이로 자르면 문장 한복판이 잘려
 * 검색된 청크가 말이 되지 않는다.
 */
function splitText(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  const chunks = []
  let start = 0

  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE, normalized.length)
    let piece = normalized.slice(start, end)

    if (end < normalized.length) {
      const boundary = Math.max(
        piece.lastIndexOf('.'),
        piece.lastIndexOf('!'),
        piece.lastIndexOf('?'),
        piece.lastIndexOf('\n'),
        piece.lastIndexOf('다.'),
      )
      if (boundary > CHUNK_SIZE * 0.5) piece = piece.slice(0, boundary + 1)
    }

    const trimmed = piece.trim()
    if (trimmed.length > 30) chunks.push(trimmed)

    const advance = Math.max(piece.length - CHUNK_OVERLAP, 1)
    start += advance
  }
  return chunks
}

async function embedAll(chunks) {
  const vectors = []
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH)
    const res = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: batch })
    // 응답 순서가 보장되지만 index 로 다시 맞춰 둔다.
    const sorted = [...res.data].sort((a, b) => a.index - b.index)
    vectors.push(...sorted.map((d) => d.embedding))
    process.stdout.write(`    임베딩 ${Math.min(i + batch.length, chunks.length)}/${chunks.length}\r`)
  }
  process.stdout.write('\n')
  return vectors
}

async function seedFile(path, name) {
  const text = await extractText(path)
  if (text === null) {
    console.log(`  · ${name} — 건너뜀 (지원하지 않는 형식)`)
    return
  }

  const chunks = splitText(text)
  if (chunks.length === 0) {
    console.log(`  · ${name} — 건너뜀 (읽을 수 있는 텍스트가 없음. 스캔 PDF 는 OCR 이 필요합니다)`)
    return
  }

  // 파일 이름을 id 로 고정해 다시 돌려도 같은 문서에 덮어쓴다.
  const id = createHash('sha1').update(name).digest('hex')
  const uuid = `${id.slice(0, 8)}-${id.slice(8, 12)}-4${id.slice(13, 16)}-a${id.slice(17, 20)}-${id.slice(20, 32)}`

  console.log(`  · ${name} — 청크 ${chunks.length}개`)
  const vectors = await embedAll(chunks)

  const { error: docError } = await sb.from('aieewa_documents').upsert({
    id: uuid,
    title: name.replace(/\.[^.]+$/, ''),
    source: name,
    kind: guessKind(name),
    chunk_count: chunks.length,
    is_shared: true,
  })
  if (docError) throw new Error(`문서 저장 실패: ${docError.message}`)

  // 청크 수가 줄어드는 경우가 있으므로 전부 지우고 다시 넣는다.
  const { error: deleteError } = await sb.from('aieewa_document_chunks').delete().eq('document_id', uuid)
  if (deleteError) throw new Error(`기존 청크 삭제 실패: ${deleteError.message}`)

  for (let i = 0; i < chunks.length; i += 100) {
    const rows = chunks.slice(i, i + 100).map((content, j) => ({
      document_id: uuid,
      chunk_index: i + j,
      content,
      embedding: vectors[i + j],
    }))
    const { error } = await sb.from('aieewa_document_chunks').insert(rows)
    if (error) throw new Error(`청크 저장 실패: ${error.message}`)
  }
}

let files
try {
  files = (await readdir(folder)).filter((f) => ['.pdf', '.txt', '.md'].includes(extname(f).toLowerCase())).sort()
} catch {
  console.error(`폴더를 열지 못했습니다: ${folder}`)
  console.error('교과서·성취기준·채점 기준 자료를 그 폴더에 넣고 다시 실행하세요. 폴더는 git 에 올라가지 않습니다.')
  process.exit(1)
}

if (files.length === 0) {
  console.error(`${folder} 에 .pdf / .txt / .md 파일이 없습니다.`)
  process.exit(1)
}

console.log(`${folder} 에서 ${files.length}개 파일을 적재합니다. 임베딩 모델: ${EMBEDDING_MODEL}\n`)

for (const name of files) {
  try {
    await seedFile(join(folder, name), name)
  } catch (err) {
    console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : err}`)
  }
}

const [{ count: docCount }, { count: chunkCount }] = await Promise.all([
  sb.from('aieewa_documents').select('id', { count: 'exact', head: true }),
  sb.from('aieewa_document_chunks').select('id', { count: 'exact', head: true }),
])
console.log(`\n✓ 코퍼스: 문서 ${docCount}건 · 청크 ${chunkCount}개`)
