'use client'

import { useRef, useCallback, KeyboardEvent } from 'react'
import { Send, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
        if (value.trim() && !isStreaming && !disabled) {
          onSend()
          // Reset height
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
          }
        }
      }
    },
    [value, isStreaming, disabled, onSend]
  )

  const handleSendClick = useCallback(() => {
    if (isStreaming) {
      onStop()
    } else if (value.trim() && !disabled) {
      onSend()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [isStreaming, value, disabled, onSend, onStop])

  const canSend = value.trim().length > 0 && !isStreaming && !disabled

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border bg-bg-primary">
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
          'flex-1 resize-none rounded-xl border border-border px-4 py-2.5',
          'text-sm font-noto-sans-jp text-text-primary placeholder:text-text-secondary/50',
          'bg-bg-secondary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
          'transition-colors duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed'
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
  )
}
