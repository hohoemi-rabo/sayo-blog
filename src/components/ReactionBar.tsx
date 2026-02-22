'use client'

import { useState, useEffect, useCallback } from 'react'

const REACTIONS = [
  { type: 'light', emoji: '💡', label: 'なるほど' },
  { type: 'heart', emoji: '🩷', label: 'すき' },
  { type: 'thumbs', emoji: '👍', label: 'いいね' },
  { type: 'fire', emoji: '🔥', label: 'アツい' },
] as const

const STORAGE_KEY_PREFIX = 'reactions_'

interface ReactionBarProps {
  postId: string
}

export default function ReactionBar({ postId }: ReactionBarProps) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [reacted, setReacted] = useState<Set<string>>(new Set())
  const [animating, setAnimating] = useState<string | null>(null)

  useEffect(() => {
    // localStorage からリアクション状態を復元
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${postId}`)
      if (stored) {
        setReacted(new Set(JSON.parse(stored)))
      }
    } catch {
      // localStorage アクセスエラーは無視
    }

    // API からカウントを取得
    fetch(`/api/reactions?postId=${postId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object' && !data.error) {
          setCounts(data)
        }
      })
      .catch(() => {})
  }, [postId])

  const handleReaction = useCallback(
    async (type: string) => {
      if (reacted.has(type)) return

      // アニメーション
      setAnimating(type)
      setTimeout(() => setAnimating(null), 300)

      // Optimistic update
      setCounts((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }))
      const newReacted = new Set([...reacted, type])
      setReacted(newReacted)

      try {
        localStorage.setItem(
          `${STORAGE_KEY_PREFIX}${postId}`,
          JSON.stringify([...newReacted])
        )
      } catch {
        // 書き込みエラーは無視
      }

      try {
        await fetch('/api/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId, reaction_type: type }),
        })
      } catch {
        // ネットワークエラーは無視（Optimistic updateを維持）
      }
    },
    [postId, reacted]
  )

  return (
    <div className="mt-8 pt-6 border-t border-border-decorative">
      <p className="text-sm text-text-secondary font-noto-sans-jp mb-3">
        この記事はいかがでしたか？
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {REACTIONS.map(({ type, emoji, label }) => (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            disabled={reacted.has(type)}
            aria-label={`${label}${reacted.has(type) ? '（リアクション済み）' : ''}`}
            className={`
              relative flex items-center gap-1.5 px-4 py-2 rounded-full
              transition-all duration-200 font-noto-sans-jp text-sm
              ${
                reacted.has(type)
                  ? 'bg-primary/10 border border-primary/30 cursor-default'
                  : 'bg-background border border-border-decorative hover:border-primary/50 hover:bg-primary/5 active:scale-95'
              }
              ${animating === type ? 'scale-110' : ''}
            `}
          >
            <span
              className={`text-lg transition-transform duration-200 ${
                animating === type ? 'scale-125' : ''
              }`}
            >
              {emoji}
            </span>
            <span className="text-text-secondary font-medium">{label}</span>
            {(counts[type] || 0) > 0 && (
              <span className="ml-0.5 text-text-secondary/70 tabular-nums">
                {counts[type]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
