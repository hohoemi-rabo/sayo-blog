'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { WelcomeScreen } from './WelcomeScreen'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { ChatTagList, type PromptTag } from './ChatTagList'
import { streamChat } from '@/lib/ai-chat-client'
import type { UIChatMessage, ArticleCard, SpotInfo } from '@/lib/types'

interface ChatPageProps {
  tags: PromptTag[]
}

function getSessionId(): string {
  const key = 'fune_session_id'
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export function ChatPage({ tags }: ChatPageProps) {
  const [messages, setMessages] = useState<UIChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sessionIdRef = useRef('')
  const lastUserMessageRef = useRef('')

  useEffect(() => {
    sessionIdRef.current = getSessionId()
  }, [])

  // ---- タイプライタ機構 (受信は streaming のまま、可視化を 1〜数文字ずつにペーシング) ----
  const typewriterRef = useRef<{
    assistantId: string
    pending: string
    done: boolean
    timer: ReturnType<typeof setTimeout> | null
  } | null>(null)

  useEffect(
    () => () => {
      if (typewriterRef.current?.timer) clearTimeout(typewriterRef.current.timer)
    },
    []
  )

  function typewriterTick() {
    const st = typewriterRef.current
    if (!st) return
    if (st.pending.length === 0) {
      if (st.done) {
        const id = st.assistantId
        typewriterRef.current = null
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isStreaming: false } : m))
        )
        setIsStreaming(false)
        abortRef.current = null
        return
      }
      st.timer = setTimeout(typewriterTick, 30)
      return
    }
    // バックログが大きいほど一度に出す文字数を増やす (詰まり防止)
    const remaining = st.pending.length
    const charsToReveal = Math.max(1, Math.min(remaining, Math.ceil(remaining / 50)))
    const take = st.pending.slice(0, charsToReveal)
    st.pending = st.pending.slice(charsToReveal)
    const id = st.assistantId
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: m.content + take } : m))
    )
    st.timer = setTimeout(typewriterTick, 15)
  }

  function startTypewriter(assistantId: string) {
    if (typewriterRef.current?.timer) clearTimeout(typewriterRef.current.timer)
    typewriterRef.current = {
      assistantId,
      pending: '',
      done: false,
      timer: setTimeout(typewriterTick, 0),
    }
  }

  function appendTypewriterText(text: string) {
    const st = typewriterRef.current
    if (!st) return
    st.pending += text
    if (!st.timer) st.timer = setTimeout(typewriterTick, 0)
  }

  function markTypewriterDone() {
    const st = typewriterRef.current
    if (!st) return
    st.done = true
    if (!st.timer) st.timer = setTimeout(typewriterTick, 0)
  }

  function cancelTypewriter() {
    const st = typewriterRef.current
    if (st?.timer) clearTimeout(st.timer)
    typewriterRef.current = null
  }

  const hasMessages = messages.length > 0
  const isLimitReached = dailyRemaining !== null && dailyRemaining <= 0

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming || isLimitReached) return

      lastUserMessageRef.current = trimmed

      // Add user message
      const userMsg: UIChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      }

      // Add assistant placeholder
      const assistantId = crypto.randomUUID()
      const assistantMsg: UIChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInputValue('')
      setIsStreaming(true)
      startTypewriter(assistantId)

      // Build history from recent messages (exclude the new ones)
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const stream = streamChat(
          trimmed,
          sessionIdRef.current,
          history,
          controller.signal
        )

        for await (const event of stream) {
          if (controller.signal.aborted) break

          switch (event.type) {
            case 'meta': {
              const meta = event.content as { daily_remaining: number }
              if (typeof meta?.daily_remaining === 'number') {
                setDailyRemaining(meta.daily_remaining)
              }
              break
            }
            case 'text':
              // タイプライタ経由で 1〜数文字ずつ可視化
              appendTypewriterText(event.content as string)
              break
            case 'articles':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, articles: event.content as ArticleCard[] }
                    : m
                )
              )
              break
            case 'spots':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, spots: event.content as SpotInfo[] }
                    : m
                )
              )
              break
            case 'suggestions':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, suggestions: event.content as string[] }
                    : m
                )
              )
              break
            case 'error':
              // エラー時はタイプライタを止めて即時表示
              cancelTypewriter()
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: event.content as string,
                        isStreaming: false,
                        isError: true,
                      }
                    : m
                )
              )
              setIsStreaming(false)
              abortRef.current = null
              break
            case 'done':
              // ストリーム終了 → タイプライタはバックログを吐き切ったら自分で finalize する
              markTypewriterDone()
              break
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Chat stream error:', err)
          cancelTypewriter()
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      'ごめんなさい、うまく接続できませんでした。もう一度お試しください。',
                    isStreaming: false,
                    isError: true,
                  }
                : m
            )
          )
          setIsStreaming(false)
          abortRef.current = null
        }
        // AbortError は handleStop 側で後始末済み
      }
    },
    // タイプライタ系ヘルパーは ref を介すのみで安定。deps に含めない (再生成不要)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isStreaming, isLimitReached, messages]
  )

  const handleSend = useCallback(() => {
    sendMessage(inputValue)
  }, [inputValue, sendMessage])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    cancelTypewriter()
    abortRef.current = null
    setIsStreaming(false)
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    )
  }, [])

  const handleRetry = useCallback(() => {
    if (!lastUserMessageRef.current || isStreaming) return
    // Remove the last error message pair (user + assistant)
    setMessages((prev) => prev.slice(0, -2))
    sendMessage(lastUserMessageRef.current)
  }, [isStreaming, sendMessage])

  const handleTagSelect = useCallback(
    (tag: PromptTag) => {
      sendMessage(tag.prompt || tag.label)
    },
    [sendMessage]
  )

  const handleSuggestionSelect = useCallback(
    (label: string) => {
      sendMessage(label)
    },
    [sendMessage]
  )

  const limitMessage = isLimitReached
    ? '今日の質問回数に達しました。また明日お気軽にどうぞ。'
    : undefined

  const inputElement = (
    <ChatInput
      value={inputValue}
      onChange={setInputValue}
      onSend={handleSend}
      onStop={handleStop}
      isStreaming={isStreaming}
      disabled={isLimitReached}
      dailyRemaining={dailyRemaining}
      limitMessage={limitMessage}
    />
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      {hasMessages ? (
        /* === Conversation layout === */
        <div key="conversation" className="flex flex-col h-full min-h-0 animate-fade-in">
          <ChatMessages
            messages={messages}
            onSuggestionSelect={handleSuggestionSelect}
            onRetry={handleRetry}
            isStreaming={isStreaming}
          />

          {/* Bottom-fixed input */}
          <div className="bg-background/95 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto w-full">
              {inputElement}
            </div>
          </div>
        </div>
      ) : (
        /* === Welcome layout === */
        <div key="welcome" className="flex-1 flex flex-col items-center justify-center px-4 pb-8 animate-fade-in">
          <WelcomeScreen />

          {/* Center input */}
          <div className="w-full max-w-2xl mt-8">
            {inputElement}
          </div>

          {/* Tags below input */}
          <div className="w-full max-w-2xl mt-3">
            <ChatTagList
              tags={tags}
              onSelect={handleTagSelect}
              disabled={isStreaming || isLimitReached}
            />
          </div>
        </div>
      )}
    </div>
  )
}
