/**
 * 서버가 흘려보내는 줄 단위 JSON 을 읽는다. src/lib/api/stream.ts 의 짝.
 * 브라우저에서 쓰므로 'server-only' 가 아니다.
 */

export type StreamEvent =
  | { type: 'step'; label: string }
  | { type: 'done'; data: unknown }
  | { type: 'error'; message: string; code?: string }

export async function* readNdjson(response: Response): AsyncGenerator<StreamEvent> {
  if (!response.body) throw new Error('서버가 응답을 보내지 않았습니다.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // 마지막 조각은 아직 줄이 끝나지 않았을 수 있으므로 버퍼에 남긴다.
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        yield JSON.parse(trimmed) as StreamEvent
      } catch {
        // 깨진 줄은 버린다. 다음 줄이 온다.
      }
    }
  }

  const rest = buffer.trim()
  if (rest) {
    try {
      yield JSON.parse(rest) as StreamEvent
    } catch {
      // 무시
    }
  }
}

/** 스트림이 아니라 평범한 JSON 오류(401·403·429 등)로 돌아온 경우의 메시지. */
export async function errorMessageFrom(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // 본문이 JSON 이 아니다.
  }
  if (response.status === 401) return '로그인이 필요합니다.'
  if (response.status === 403) return '이 도구를 쓸 권한이 없습니다.'
  if (response.status === 429) return '사용 한도에 걸렸습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.'
  return `요청이 실패했습니다 (${response.status}).`
}
