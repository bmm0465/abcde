import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

/**
 * Field Notes 로더. src/content/notes/*.md 를 읽는다.
 * 프런트매터: title · date(YYYY-MM-DD) · category · image(선택) · summary(선택)
 */

export interface Note {
  slug: string
  title: string
  date: string
  category: string
  image?: string
  summary: string
  body: string
}

const NOTES_DIR = path.join(process.cwd(), 'src', 'content', 'notes')

function firstParagraph(markdown: string): string {
  const blocks = markdown
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b && !b.startsWith('#') && !b.startsWith('!') && !b.startsWith('```'))
  const raw = blocks[0] ?? ''
  const text = raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 140 ? `${text.slice(0, 140).trimEnd()}…` : text
}

function toNote(slug: string, source: string): Note | null {
  const { data, content } = matter(source)
  const title = typeof data.title === 'string' ? data.title : null
  const category = typeof data.category === 'string' ? data.category : '기록'
  const rawDate = data.date
  const date =
    rawDate instanceof Date
      ? rawDate.toISOString().slice(0, 10)
      : typeof rawDate === 'string'
        ? rawDate.slice(0, 10)
        : null
  if (!title || !date) return null
  return {
    slug,
    title,
    date,
    category,
    image: typeof data.image === 'string' ? data.image : undefined,
    summary: typeof data.summary === 'string' ? data.summary : firstParagraph(content),
    body: content,
  }
}

export async function getNotes(): Promise<Note[]> {
  let files: string[]
  try {
    files = await fs.readdir(NOTES_DIR)
  } catch {
    return []
  }
  const notes = await Promise.all(
    files
      .filter((f) => f.endsWith('.md'))
      .map(async (f) => toNote(f.replace(/\.md$/, ''), await fs.readFile(path.join(NOTES_DIR, f), 'utf8'))),
  )
  return notes
    .filter((n): n is Note => n !== null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export async function getNote(slug: string): Promise<Note | null> {
  // 경로 조작 방지: 슬러그는 파일 이름 그대로만 허용한다.
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  try {
    const source = await fs.readFile(path.join(NOTES_DIR, `${slug}.md`), 'utf8')
    return toNote(slug, source)
  } catch {
    return null
  }
}

export function formatDate(iso: string): string {
  return iso.replaceAll('-', '.')
}
