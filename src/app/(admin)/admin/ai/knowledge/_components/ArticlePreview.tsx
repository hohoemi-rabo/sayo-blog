'use client'

import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface ArticlePreviewProps {
  title: string
  content: string
  needsUpdate?: boolean
}

export function ArticlePreview({ title, content, needsUpdate }: ArticlePreviewProps) {
  return (
    <div className="sticky top-24">
      <div className="bg-white rounded-lg border border-border-decorative overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border-decorative bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary text-sm">元記事プレビュー</h3>
            {needsUpdate && (
              <Badge className="bg-amber-100 text-amber-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                要更新
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1 line-clamp-1">{title}</p>
        </div>

        {/* Content */}
        <div
          className="p-4 max-h-[calc(100vh-12rem)] overflow-y-auto prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  )
}
