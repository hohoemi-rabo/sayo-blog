'use client'

import { Lightbulb } from 'lucide-react'

interface ChatSuggestionsProps {
  suggestions: string[]
  onSelect: (label: string) => void
  disabled?: boolean
}

export function ChatSuggestions({
  suggestions,
  onSelect,
  disabled,
}: ChatSuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="mt-3">
      <p className="flex items-center gap-1 text-xs text-text-secondary mb-2">
        <Lightbulb className="w-3 h-3" />
        こちらも聞いてみては？
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((label) => (
          <button
            key={label}
            onClick={() => onSelect(label)}
            disabled={disabled}
            className="px-3 py-1 text-xs rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-noto-sans-jp"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
