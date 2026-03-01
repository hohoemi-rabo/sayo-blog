import type { ChatMessage, ChatStreamEvent } from './types'

export async function* streamChat(
  message: string,
  sessionId: string,
  history: ChatMessage[],
  signal?: AbortSignal
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId, history }),
    signal,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    yield {
      type: 'error',
      content: data.error || `エラーが発生しました (${response.status})`,
    }
    yield { type: 'done', content: '' }
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    yield { type: 'error', content: 'ストリームの読み取りに失敗しました' }
    yield { type: 'done', content: '' }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        try {
          const event = JSON.parse(data) as ChatStreamEvent
          yield event
          if (event.type === 'done') return
        } catch {
          // ignore parse errors
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
