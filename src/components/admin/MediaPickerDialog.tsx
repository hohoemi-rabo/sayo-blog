'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { Loader2, Search, ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface MediaFile {
  id: string
  name: string
  url: string
  size: number
  createdAt: string
  path: string
}

interface MediaPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (url: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function MediaPickerDialog({ open, onOpenChange, onSelect }: MediaPickerDialogProps) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
  const [mounted, setMounted] = useState(false)
  const hasFetched = useRef(false)

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const fetchFiles = useCallback(async () => {
    if (hasFetched.current) return
    hasFetched.current = true

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/media')
      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setFiles(data.files || [])
      }
    } catch {
      setError('メディアの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && !hasFetched.current) {
      fetchFiles()
    }
    if (!open) {
      // Reset when closed
      setSelectedFile(null)
      setSearchQuery('')
      hasFetched.current = false
    }
  }, [open, fetchFiles])

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelect = useCallback(() => {
    if (selectedFile) {
      onSelect(selectedFile.url)
    }
  }, [selectedFile, onSelect])

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Don't render on server or when not open
  if (!mounted || !open) return null

  const dialogContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* Dialog */}
      <div
        className="relative z-[101] w-full max-w-4xl max-h-[80vh] mx-4 bg-white rounded-lg shadow-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-decorative">
          <h2 className="text-lg font-semibold">メディアライブラリから選択</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border-decorative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              placeholder="ファイル名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border-decorative rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-500">{error}</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
              <ImageIcon className="h-12 w-12 mb-2" />
              <p>{searchQuery ? '該当する画像がありません' : '画像がありません'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredFiles.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedFile(file)}
                  className={cn(
                    'relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none',
                    selectedFile?.id === file.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-transparent hover:border-primary/50'
                  )}
                >
                  <Image
                    src={file.url}
                    alt={file.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 20vw"
                  />
                  {selectedFile?.id === file.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-white rounded-full p-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected file info */}
        {selectedFile && (
          <div className="px-4 py-3 border-t border-border-decorative">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                <Image
                  src={selectedFile.url}
                  alt={selectedFile.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border-decorative">
          <Button variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleSelect}
            disabled={!selectedFile}
          >
            選択する
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogContent, document.body)
}
