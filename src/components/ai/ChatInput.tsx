'use client'

import { useRef, useCallback, useEffect, KeyboardEvent } from 'react'
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

  useEffect(() => {
    adjustHeight()
  }, [adjustHeight])

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
    <div className="px-3 pb-3 pt-2">
      {/* Limit reached message */}
      {disabled && limitMessage && (
        <div className="flex items-center justify-between gap-2 mb-2 px-2">
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

      {/* Gemini-style input box */}
      <div
        className={cn(
          'relative rounded-2xl border bg-white shadow-sm',
          'transition-all duration-200',
          'focus-within:shadow-md focus-within:border-primary/30',
          isOverLimit
            ? 'border-red-400'
            : 'border-border-decorative',
          disabled && 'opacity-50'
        )}
      >
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
            'w-full resize-none bg-transparent',
            'px-5 pt-4 pb-12',
            'text-base font-noto-sans-jp text-text-primary',
            'placeholder:text-text-secondary/40',
            'focus:outline-none',
            'disabled:cursor-not-allowed'
          )}
        />

        {/* Bottom bar inside the box */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
          {/* Left: remaining count */}
          <div>
            {showRemaining && !disabled && (
              <span className="text-xs text-amber-500 font-noto-sans-jp">
                残り {dailyRemaining} 回
              </span>
            )}
          </div>

          {/* Right: char count + send/stop button */}
          <div className="flex items-center gap-2">
            {showCharCount && !disabled && (
              <span
                className={cn(
                  'text-xs font-noto-sans-jp',
                  isOverLimit ? 'text-red-500 font-medium' : 'text-text-secondary/40'
                )}
              >
                {charCount}/{MAX_LENGTH}
              </span>
            )}

            <button
              onClick={handleSendClick}
              disabled={!canSend && !isStreaming}
              aria-label={isStreaming ? 'ストリーミング停止' : '送信'}
              className={cn(
                'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200',
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
        </div>
      </div>
    </div>
  )
}
