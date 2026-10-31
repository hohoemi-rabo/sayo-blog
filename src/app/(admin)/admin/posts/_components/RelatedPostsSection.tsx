'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ArrowDown, ArrowUp, Loader2, Plus, X } from 'lucide-react'
import { searchRelatedPostOptions, type RelatedPostOption } from '../actions'
import { RELATED_POSTS_COUNT } from '@/lib/related-posts'

interface RelatedPostsSectionProps {
  /** 選んだ記事 (表示順) */
  value: RelatedPostOption[]
  onChange: (next: RelatedPostOption[]) => void
  /** 編集中の記事 (新規作成では無し)。自分自身は候補に出さない */
  postId?: string
  /** 編集中のカテゴリ・ハッシュタグ (保存前の値)。同じカテゴリ・共通タグの記事を上に並べる */
  categoryId: string | null
  hashtagIds: string[]
}

const SEARCH_DEBOUNCE_MS = 300

/** 公開ページに出ない理由 (出るなら null) */
function hiddenReason(p: RelatedPostOption): string | null {
  if (!p.is_published) return '下書き'
  if (p.event_ended) return '終了'
  return null
}

function StatusBadge({ post }: { post: RelatedPostOption }) {
  const reason = hiddenReason(post)
  if (!reason) return null
  return (
    <span className="ml-1 inline-block shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
      {reason}
    </span>
  )
}

/**
 * 記事編集画面の「関連記事」カード (Ticket 45)。
 * 最大 3 件をタイトル検索で選び、並べ替え・外しができる。選ばなかった枠は公開側が自動で埋める。
 */
export function RelatedPostsSection({
  value,
  onChange,
  postId,
  categoryId,
  hashtagIds,
}: RelatedPostsSectionProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RelatedPostOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  // 古い検索の結果が後から届いて上書きしないように、最新のリクエストだけ反映する
  const requestSeq = useRef(0)

  const isFull = value.length >= RELATED_POSTS_COUNT
  // 配列は毎回別物になるので、中身が変わったときだけ検索し直す
  const hashtagKey = hashtagIds.join(',')

  useEffect(() => {
    if (!isOpen) return
    const seq = ++requestSeq.current
    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const found = await searchRelatedPostOptions(query, {
          excludeId: postId,
          categoryId,
          hashtagIds: hashtagKey ? hashtagKey.split(',') : [],
        })
        if (seq === requestSeq.current) setResults(found)
      } catch {
        if (seq === requestSeq.current) setResults([])
      } finally {
        if (seq === requestSeq.current) setIsSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, postId, isOpen, categoryId, hashtagKey])

  const selectedIds = new Set(value.map((p) => p.id))

  const add = (post: RelatedPostOption) => {
    if (isFull || selectedIds.has(post.id)) return
    onChange([...value, post])
  }
  const remove = (id: string) => onChange(value.filter((p) => p.id !== id))
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const hasHidden = value.some((p) => hiddenReason(p))

  return (
    <Card className="p-6 bg-white">
      <h3 className="font-semibold text-text-primary mb-1">関連記事</h3>
      <p className="mb-4 text-xs text-text-secondary">
        記事の下に出る「関連記事」を {RELATED_POSTS_COUNT} 件まで選べます (選んだ順に表示)。
        空いた枠は、同じカテゴリの記事から自動で選ばれます。
        候補は同じカテゴリ・共通ハッシュタグの多い記事から順に出ます。
      </p>

      {value.length === 0 ? (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-text-secondary">
          選んでいません。{RELATED_POSTS_COUNT} 件とも自動で選ばれます。
        </p>
      ) : (
        <ol className="space-y-2">
          {value.map((post, i) => (
            <li
              key={post.id}
              className="flex items-center gap-2 rounded-md border border-border-decorative px-2 py-2 text-sm"
            >
              <span className="w-4 shrink-0 text-center text-xs text-text-secondary">{i + 1}</span>
              <span className="min-w-0 flex-1 break-words text-text-primary">
                {post.title}
                <StatusBadge post={post} />
              </span>
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`「${post.title}」を上へ`}
                  className="rounded p-1 text-text-secondary hover:bg-gray-100 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label={`「${post.title}」を下へ`}
                  className="rounded p-1 text-text-secondary hover:bg-gray-100 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(post.id)}
                  aria-label={`「${post.title}」を外す`}
                  className="rounded p-1 text-text-secondary hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {hasHidden && (
        <p className="mt-2 text-xs text-amber-700">
          「下書き」「終了」の記事は公開ページには出ません (公開・開催中になれば出ます)。
          その枠は自動で選ばれた記事で埋まります。
        </p>
      )}

      <div className="mt-4 border-t border-border-decorative pt-4">
        {isFull ? (
          <p className="text-xs text-text-secondary">
            {RELATED_POSTS_COUNT} 件選んでいます。入れ替えるときは × で外してください。
          </p>
        ) : (
          <>
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              // 記事フォームの中なので、Enter で記事ごと保存されないようにする
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault()
              }}
              placeholder="タイトルで探す"
              aria-label="関連記事をタイトルで探す"
            />
            {isOpen && (
              <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-border-decorative">
                {isSearching && results.length === 0 ? (
                  <p className="flex items-center gap-2 px-3 py-2 text-xs text-text-secondary">
                    <Loader2 className="h-3 w-3 animate-spin" /> 探しています…
                  </p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-text-secondary">見つかりませんでした</p>
                ) : (
                  <ul>
                    {results.map((post) => {
                      const already = selectedIds.has(post.id)
                      return (
                        <li key={post.id}>
                          <button
                            type="button"
                            onClick={() => add(post)}
                            disabled={already}
                            className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-default disabled:opacity-50"
                          >
                            <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1 break-words text-text-primary">
                              {post.title}
                              <StatusBadge post={post} />
                              {already && (
                                <span className="ml-1 text-[10px] text-text-secondary">選択中</span>
                              )}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
