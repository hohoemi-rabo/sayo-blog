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

const TAG_TYPE_STYLES: Record<string, { base: string; hover: string }> = {
  purpose: {
    base: 'border-primary/20 text-text-secondary',
    hover: 'hover:border-primary/50 hover:text-primary hover:bg-primary/5',
  },
  area: {
    base: 'border-blue-400/20 text-text-secondary',
    hover: 'hover:border-blue-400/50 hover:text-blue-600 hover:bg-blue-50',
  },
  scene: {
    base: 'border-green-500/20 text-text-secondary',
    hover: 'hover:border-green-500/50 hover:text-green-600 hover:bg-green-50',
  },
}

export function ChatTagList({ tags, onSelect, disabled }: ChatTagListProps) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap justify-center gap-2 px-4 py-2">
      {tags.map((tag) => {
        const style = TAG_TYPE_STYLES[tag.tag_type] || TAG_TYPE_STYLES.purpose
        return (
          <button
            key={tag.id}
            onClick={() => onSelect(tag)}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full border font-noto-sans-jp transition-colors duration-200',
              'bg-bg-primary',
              style.base,
              style.hover,
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}
