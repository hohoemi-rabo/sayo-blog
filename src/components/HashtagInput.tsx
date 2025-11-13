'use client'

import { useState, useRef, useEffect } from 'react'
import { Hashtag } from '@/lib/types'
import { Badge } from './ui/Badge'

interface HashtagInputProps {
  selectedHashtags: string[]
  onChange: (hashtags: string[]) => void
  availableHashtags: Hashtag[]
  disabled?: boolean
}

export default function HashtagInput({
  selectedHashtags,
  onChange,
  availableHashtags,
  disabled,
}: HashtagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter suggestions based on input
  const suggestions = availableHashtags.filter(
    (hashtag) =>
      hashtag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedHashtags.includes(hashtag.slug)
  )

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addHashtag = (slug: string) => {
    if (!selectedHashtags.includes(slug)) {
      onChange([...selectedHashtags, slug])
    }
    setInputValue('')
    setShowSuggestions(false)
  }

  const removeHashtag = (slug: string) => {
    onChange(selectedHashtags.filter((h) => h !== slug))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault()
      addHashtag(suggestions[0].slug)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="flex-1 space-y-2">
      <label
        htmlFor="hashtags"
        className="text-sm font-noto-sans-jp font-medium text-text-primary"
      >
        ハッシュタグ
      </label>

      {/* Selected hashtags */}
      {selectedHashtags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedHashtags.map((slug) => {
            const hashtag = availableHashtags.find((h) => h.slug === slug)
            return (
              <button
                key={slug}
                onClick={() => removeHashtag(slug)}
                disabled={disabled}
                className="group"
                type="button"
              >
                <Badge variant="default" className="cursor-pointer hover:bg-primary/30 transition-colors">
                  #{hashtag?.name || slug}
                  <span className="ml-1 text-xs opacity-70 group-hover:opacity-100">×</span>
                </Badge>
              </button>
            )
          })}
        </div>
      )}

      {/* Input with autocomplete */}
      <div className="relative">
        <input
          ref={inputRef}
          id="hashtags"
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="ハッシュタグを検索..."
          disabled={disabled}
          className="w-full px-4 py-2 pr-10 rounded-lg border border-border-decorative bg-background text-text-primary font-noto-sans-jp focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
          />
        </svg>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && inputValue && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-background border border-border-decorative rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.slice(0, 10).map((hashtag) => (
              <button
                key={hashtag.id}
                type="button"
                onClick={() => addHashtag(hashtag.slug)}
                className="w-full px-4 py-2 text-left hover:bg-primary/10 transition-colors font-noto-sans-jp text-text-primary"
              >
                <span className="font-medium">#{hashtag.name}</span>
                <span className="ml-2 text-xs text-text-secondary">({hashtag.count}件)</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
