import 'server-only'

/**
 * 진행 상황을 줄 단위 JSON(NDJSON)으로 흘려보낸다.
 *
 * 문항 생성은 30초에서 1분이 걸린다. 그동안 빈 화면을 보여 주는 대신 지금 무엇을 하는지
 * 한 줄씩 내려보낸다. 가짜 진행률 막대를 쓰지 않는 이유이기도 하다(docs/03 §6).
 *
 * 줄 형식
 *   {"type":"step","label":"문항 생성 중"}
 *   {"type":"done","data":{...}}
 *   {"type":"error","message":"...","code":"..."}
 */

export type StreamEvent =
  | { type: 'step'; label: string }
  | { type: 'done'; data: unknown }
  | { type: 'error'; message: string; code?: string }

export interface StreamHandle {
  step: (label: string) => void
  done: (data: unknown) => void
  fail: (message: string, code?: string) => void
}

export function ndjsonStream(run: (handle: StreamHandle) => Promise<void>): Response {
  const encoder = new TextEncoder()

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const send = (event: StreamEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        } catch {
          // 브라우저가 먼저 끊었다. 서버 작업은 그대로 끝까지 간다(사용량은 기록되어야 한다).
          closed = true
        }
      }

      try {
        await run({
          step: (label) => send({ type: 'step', label }),
          done: (data) => send({ type: 'done', data }),
          fail: (message, code) => send({ type: 'error', message, code }),
        })
      } catch (err) {
        send({
          type: 'error',
          message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
        })
      } finally {
        closed = true
        try {
          controller.close()
        } catch {
          // 이미 닫혔다.
        }
      }
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      // 프록시가 버퍼링하면 한 줄씩 흘려보내는 의미가 없다.
      'X-Accel-Buffering': 'no',
    },
  })
}
