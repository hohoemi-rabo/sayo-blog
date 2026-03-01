'use client'

import { cn } from '@/lib/utils'

export interface PromptTag {
  id: string
  label: string
  prompt: string
  tag_type: string
}

interface ChatTagListProps {
  tags: PromptTag[]
  onSelect: (tag: PromptTag) => void
  disabled?: boolean
}

export function ChatTagList({ tags, onSelect, disabled }: ChatTagListProps) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap justify-center gap-2 px-4 py-2">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelect(tag)}
          disabled={disabled}
          className={cn(
            'px-3 py-1.5 text-sm rounded-full border font-noto-sans-jp transition-colors duration-200',
            'border-primary/20 text-text-secondary bg-bg-primary',
            'hover:border-primary/50 hover:text-primary hover:bg-primary/5',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {tag.label}
        </button>
      ))}
    </div>
  )
}
