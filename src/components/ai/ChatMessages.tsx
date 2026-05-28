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

/** ストリーミング追従とみなす最下部からの距離 (px) */
const NEAR_BOTTOM_THRESHOLD = 80

export function ChatMessages({
  messages,
  onSuggestionSelect,
  onRetry,
  isStreaming,
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  // ユーザーが最下部付近にいるか (streaming 追従するかの判定)
  const isAtBottomRef = useRef(true)
  // メッセージ件数の前回値 (新規追加検知用)
  const prevLengthRef = useRef(messages.length)

  // スクロール位置監視: ユーザーが上にスクロールしたら追従を止める
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      isAtBottomRef.current =
        scrollHeight - scrollTop - clientHeight < NEAR_BOTTOM_THRESHOLD
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // 新しいメッセージが追加されたら必ず下にスクロール (smooth)
  // それ以外 (= ストリーミング中の content 更新) は、ユーザーが最下部付近にいるときだけ
  // 即時スクロール。上に離れている時は追従しない (= 引き戻し防止)
  useEffect(() => {
    const isNewMessage = messages.length > prevLengthRef.current
    prevLengthRef.current = messages.length
    if (isNewMessage) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      isAtBottomRef.current = true
      return
    }
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [messages])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 pt-8 pb-4 sm:pt-10"
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
