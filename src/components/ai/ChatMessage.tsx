'use client'

import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { RefreshCw, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatArticleCard } from './ChatArticleCard'
import { ChatSpotCard } from './ChatSpotCard'
import { ChatSuggestions } from './ChatSuggestions'
import type { UIChatMessage } from '@/lib/types'

interface ChatMessageProps {
  message: UIChatMessage
  onSuggestionSelect?: (label: string) => void
  onRetry?: () => void
  isStreamingActive?: boolean
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1 py-2">
      <span className="text-sm text-text-secondary font-noto-sans-jp">
        考え中
      </span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-text-secondary/50 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </div>
  )
}

function StreamingCursor() {
  return (
    <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
  )
}

function cleanMarkers(text: string): string {
  return text
    .replace(/\[\[([^\]]+)\]\]/g, '')
    .replace(/\{\{spot:([^}]+)\}\}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const ChatMessage = memo(function ChatMessage({
  message,
  onSuggestionSelect,
  onRetry,
  isStreamingActive,
}: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const showThinking = isAssistant && message.isStreaming && !message.content
  const showCursor = isAssistant && message.isStreaming && message.content
  const displayContent = isAssistant ? cleanMarkers(message.content) : message.content

  return (
    <div
      className={cn('animate-slide-in flex gap-2 mb-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* FUNE avatar (mobile only) */}
      {isAssistant && (
        <div className="lg:hidden flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
          <span className="text-sm font-playfair font-bold text-primary">F</span>
        </div>
      )}

      {/* Message body */}
      <div
        className={cn(
          'max-w-[85%] lg:max-w-[70%]',
          isUser && 'ml-auto',
          isAssistant && 'mr-auto'
        )}
      >
        {/* Bubble (mobile) / Flat (desktop) */}
        <div
          className={cn(
            'font-noto-sans-jp text-sm leading-relaxed',
            // Mobile: bubble style
            isUser && 'rounded-2xl rounded-tr-sm px-4 py-2.5 bg-primary text-white',
            isAssistant &&
              'rounded-2xl rounded-tl-sm px-4 py-2.5 bg-bg-secondary text-text-primary',
            // Desktop: flat style
            isUser && 'lg:rounded-2xl',
            isAssistant &&
              'lg:bg-transparent lg:px-0 lg:py-0'
          )}
        >
          {showThinking && <ThinkingIndicator />}

          {displayContent && (
            <div
              className={cn(
                'prose prose-sm max-w-none',
                isUser && 'prose-invert [&_*]:!text-white',
                isAssistant && '[&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:mt-3 [&_h2]:mt-3 [&_h3]:mt-2'
              )}
            >
              <ReactMarkdown>{displayContent}</ReactMarkdown>
              {showCursor && <StreamingCursor />}
            </div>
          )}
        </div>

        {/* Post-streaming attachments */}
        {isAssistant && !message.isStreaming && (
          <>
            {/* Error actions: retry + blog link */}
            {message.isError && (
              <div className="flex items-center gap-3 mt-2">
                {onRetry && !isStreamingActive && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-noto-sans-jp"
                  >
                    <RefreshCw className="w-3 h-3" />
                    もう一度試す
                  </button>
                )}
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-primary font-noto-sans-jp"
                >
                  <BookOpen className="w-3 h-3" />
                  ブログ記事を見る
                </Link>
              </div>
            )}

            {/* Article cards */}
            {message.articles && message.articles.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.articles.map((article) => (
                  <ChatArticleCard key={article.slug} article={article} />
                ))}
              </div>
            )}

            {/* Spot cards */}
            {message.spots && message.spots.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.spots.map((spot) => (
                  <ChatSpotCard key={spot.name} spot={spot} />
                ))}
              </div>
            )}

            {/* Suggestions */}
            {message.suggestions && message.suggestions.length > 0 && onSuggestionSelect && (
              <ChatSuggestions
                suggestions={message.suggestions}
                onSelect={onSuggestionSelect}
                disabled={isStreamingActive}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
})
