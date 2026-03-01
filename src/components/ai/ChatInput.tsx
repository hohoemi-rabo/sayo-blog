'use client'

import { useRef, useCallback, KeyboardEvent } from 'react'
import { Send, Square, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const MAX_LENGTH = 500

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
  dailyRemaining?: number | null
  limitMessage?: string
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
  dailyRemaining,
  limitMessage,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const charCount = value.length
  const isOverLimit = charCount > MAX_LENGTH
  const showCharCount = charCount > 0
  const showRemaining =
    dailyRemaining !== null &&
    dailyRemaining !== undefined &&
    dailyRemaining <= 5 &&
    dailyRemaining > 0

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [])

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
      adjustHeight()
    },
    [onChange, adjustHeight]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault()
        if (value.trim() && !isStreaming && !disabled && !isOverLimit) {
          onSend()
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
          }
        }
      }
    },
    [value, isStreaming, disabled, isOverLimit, onSend]
  )

  const handleSendClick = useCallback(() => {
    if (isStreaming) {
      onStop()
    } else if (value.trim() && !disabled && !isOverLimit) {
      onSend()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [isStreaming, value, disabled, isOverLimit, onSend, onStop])

  const canSend =
    value.trim().length > 0 && !isStreaming && !disabled && !isOverLimit

  return (
    <div className="p-3 border-t border-border bg-bg-primary">
      {/* Limit reached message */}
      {disabled && limitMessage && (
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <p className="text-xs text-text-secondary font-noto-sans-jp">
            {limitMessage}
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap font-noto-sans-jp"
          >
            <BookOpen className="w-3 h-3" />
            ブログ記事を見る
          </Link>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="FUNE に質問する..."
          aria-label="FUNE に質問する"
          disabled={isStreaming || disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-xl border px-4 py-2.5',
            'text-sm font-noto-sans-jp text-text-primary placeholder:text-text-secondary/50',
            'bg-bg-secondary focus:outline-none focus:ring-1 transition-colors duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isOverLimit
              ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
              : 'border-border focus:border-primary/50 focus:ring-primary/20'
          )}
        />
        <button
          onClick={handleSendClick}
          disabled={!canSend && !isStreaming}
          aria-label={isStreaming ? 'ストリーミング停止' : '送信'}
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200',
            isStreaming
              ? 'bg-red-500 text-white hover:bg-red-600'
              : canSend
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          {isStreaming ? (
            <Square className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Footer info: char count + remaining */}
      {(showCharCount || showRemaining) && !disabled && (
        <div className="flex items-center justify-between mt-1 px-1">
          <div>
            {showRemaining && (
              <span className="text-xs text-amber-500 font-noto-sans-jp">
                残り {dailyRemaining} 回
              </span>
            )}
          </div>
          <div>
            {showCharCount && (
              <span
                className={cn(
                  'text-xs font-noto-sans-jp',
                  isOverLimit ? 'text-red-500 font-medium' : 'text-text-secondary/50'
                )}
              >
                {charCount} / {MAX_LENGTH}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
