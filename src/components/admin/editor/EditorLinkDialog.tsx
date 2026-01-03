'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Link as LinkIcon, ExternalLink, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface EditorLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (url: string, openInNewTab: boolean) => void
  onRemove: () => void
  initialUrl?: string
  selectedText?: string
  isEditing?: boolean
}

export function EditorLinkDialog({
  open,
  onOpenChange,
  onSubmit,
  onRemove,
  initialUrl = '',
  selectedText = '',
  isEditing = false,
}: EditorLinkDialogProps) {
  const [url, setUrl] = useState(initialUrl)
  const [openInNewTab, setOpenInNewTab] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (open) {
      setUrl(initialUrl)
      setError(null)
    }
  }, [open, initialUrl])

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setError('URLを入力してください')
      return false
    }

    // Allow relative URLs starting with /
    if (value.startsWith('/')) {
      return true
    }

    // Check for valid URL pattern
    try {
      // Add https:// if no protocol specified
      const urlToCheck = value.match(/^https?:\/\//) ? value : `https://${value}`
      new URL(urlToCheck)
      return true
    } catch {
      setError('有効なURLを入力してください')
      return false
    }
  }

  const handleSubmit = useCallback(() => {
    if (!validateUrl(url)) return

    let finalUrl = url.trim()
    // Add https:// if no protocol and not a relative URL
    if (!finalUrl.startsWith('/') && !finalUrl.match(/^https?:\/\//)) {
      finalUrl = `https://${finalUrl}`
    }

    onSubmit(finalUrl, openInNewTab)
    onOpenChange(false)
  }, [url, openInNewTab, onSubmit, onOpenChange])

  const handleRemove = useCallback(() => {
    onRemove()
    onOpenChange(false)
  }, [onRemove, onOpenChange])

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      handleClose()
    }
  }

  if (!mounted || !open) return null

  const dialogContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={handleClose}
    >
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      <div
        className="relative z-[101] w-full max-w-md mx-4 bg-white rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-decorative">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {isEditing ? 'リンクを編集' : 'リンクを挿入'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Selected text display */}
          {selectedText && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-text-secondary mb-1">選択中のテキスト</p>
              <p className="text-sm text-text-primary font-medium truncate">
                &quot;{selectedText}&quot;
              </p>
            </div>
          )}

          {/* URL input */}
          <div>
            <label htmlFor="link-url" className="block text-sm font-medium text-text-primary mb-1.5">
              URL
            </label>
            <div className="relative">
              <input
                id="link-url"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError(null)
                }}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com または /path"
                autoFocus
                className={cn(
                  'w-full px-3 py-2.5 border rounded-lg text-sm transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                  error
                    ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-border-decorative'
                )}
              />
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-red-500">{error}</p>
            )}
            <p className="mt-1.5 text-xs text-text-secondary">
              外部リンクはhttps://から、サイト内リンクは/から始めてください
            </p>
          </div>

          {/* Open in new tab option */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={openInNewTab}
                onChange={(e) => setOpenInNewTab(e.target.checked)}
                className="sr-only peer"
              />
              <div className={cn(
                'w-5 h-5 border-2 rounded transition-all',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20',
                openInNewTab
                  ? 'bg-primary border-primary'
                  : 'border-gray-300 group-hover:border-primary/50'
              )}>
                {openInNewTab && (
                  <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <ExternalLink className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-primary">新しいタブで開く</span>
            </div>
          </label>

          {/* URL Preview */}
          {url && !error && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 mb-1">プレビュー</p>
              <a
                href={url.startsWith('/') || url.match(/^https?:\/\//) ? url : `https://${url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-700 hover:underline break-all flex items-center gap-1"
              >
                {url.startsWith('/') || url.match(/^https?:\/\//) ? url : `https://${url}`}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border-decorative bg-gray-50 rounded-b-lg">
          <div>
            {isEditing && (
              <Button
                variant="outline"
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Unlink className="h-4 w-4 mr-1.5" />
                リンクを解除
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {isEditing ? '更新' : '挿入'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogContent, document.body)
}
