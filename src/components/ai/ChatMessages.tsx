'use client'

import { useRef, useEffect } from 'react'
import { ChatMessage } from './ChatMessage'
import type { UIChatMessage } from '@/lib/types'

interface ChatMessagesProps {
  messages: UIChatMessage[]
  onSuggestionSelect: (label: string) => void
  onRetry: () => void
  isStreaming: boolean
}

export function ChatMessages({
  messages,
  onSuggestionSelect,
  onRetry,
  isStreaming,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages or content updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4"
      aria-live="polite"
      aria-label="会話エリア"
    >
      <div className="max-w-3xl mx-auto">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onSuggestionSelect={onSuggestionSelect}
            onRetry={msg.isError ? onRetry : undefined}
            isStreamingActive={isStreaming}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
