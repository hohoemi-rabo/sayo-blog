'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import Link from 'next/link'
import Image from 'next/image'

interface SearchSuggestion {
  posts: Array<{
    id: string
    title: string
    slug: string
    thumbnail_url?: string | null
    prefecture: string
  }>
  hashtags: Array<{
    id: string
    name: string
    slug: string
    count: number
  }>
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion>({ posts: [], hashtags: [] })
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      setIsLoading(true)
      fetch(`/api/search/suggest?q=${encodeURIComponent(debouncedQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          setSuggestions(data)
          setIsOpen(true)
        })
        .catch((error) => {
          console.error('Error fetching suggestions:', error)
        })
        .finally(() => setIsLoading(false))
    } else {
      setSuggestions({ posts: [], hashtags: [] })
      setIsOpen(false)
    }
  }, [debouncedQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      setIsOpen(false)
      setQuery('') // Clear search input after navigation
    }
  }

  const handleClear = () => {
    setQuery('')
    setIsOpen(false)
    setSuggestions({ posts: [], hashtags: [] })
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const hasSuggestions = suggestions.posts.length > 0 || suggestions.hashtags.length > 0

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="記事を検索..."
          className="w-full pl-12 pr-12 py-3 rounded-xl border border-border-decorative
            focus:outline-none focus:ring-2 focus:ring-primary font-noto-sans-jp
            transition-shadow"
          aria-label="記事を検索"
        />

        {isLoading && (
          <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary animate-spin" />
        )}

        {query && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-background-dark/5 rounded-full transition-colors"
            aria-label="検索をクリア"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {isOpen && hasSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border-decorative
          rounded-xl shadow-decorative-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
          {/* Post Suggestions */}
          {suggestions.posts.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-text-secondary font-noto-sans-jp">
                記事
              </div>
              {suggestions.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/${post.prefecture}/${post.slug}`}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-background-dark/5 rounded-lg transition-colors"
                  onClick={() => {
                    setIsOpen(false)
                    setQuery('')
                  }}
                >
                  {post.thumbnail_url && (
                    <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden">
                      <Image
                        src={post.thumbnail_url}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  )}
                  <span className="text-sm font-noto-serif-jp line-clamp-2">{post.title}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Hashtag Suggestions */}
          {suggestions.hashtags.length > 0 && (
            <div className="p-2 border-t border-border-decorative">
              <div className="px-3 py-2 text-xs font-semibold text-text-secondary font-noto-sans-jp">
                ハッシュタグ
              </div>
              <div className="flex flex-wrap gap-2 px-3">
                {suggestions.hashtags.map((hashtag) => (
                  <Link
                    key={hashtag.id}
                    href={`/?hashtags=${hashtag.slug}`}
                    className="inline-flex items-center px-3 py-1.5 bg-background-dark/5
                      hover:bg-primary/10 text-text-secondary hover:text-primary
                      rounded-full text-sm font-noto-sans-jp transition-colors"
                    onClick={() => {
                      setIsOpen(false)
                      setQuery('')
                    }}
                  >
                    #{hashtag.name}
                    <span className="ml-1 text-xs opacity-60">({hashtag.count})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
