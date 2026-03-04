'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + (event.content as string) }
                    : m
                )
              )
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
              break
            case 'done':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                )
              )
              break
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Chat stream error:', err)
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
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [isStreaming, isLimitReached, messages]
  )

  const handleSend = useCallback(() => {
    sendMessage(inputValue)
  }, [inputValue, sendMessage])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
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
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        {hasMessages ? (
          /* === Conversation layout === */
          <motion.div
            key="conversation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
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
          </motion.div>
        ) : (
          /* === Welcome layout === */
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30, transition: { duration: 0.15 } }}
            className="flex-1 flex flex-col items-center justify-center px-4 pb-8"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
