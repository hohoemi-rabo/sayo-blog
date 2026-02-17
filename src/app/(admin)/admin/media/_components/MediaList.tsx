'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Trash2, Copy, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { MediaFile, MediaUsageResult, deleteMediaFile, deleteMultipleMediaFiles, checkMediaUsage } from '../actions'
import { cn } from '@/lib/utils'

interface MediaListProps {
  initialFiles: MediaFile[]
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MediaList({ initialFiles }: MediaListProps) {
  const [files, setFiles] = useState<MediaFile[]>(initialFiles)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null)
  const [deleteTargetUsage, setDeleteTargetUsage] = useState<MediaUsageResult | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [bulkDeleteUsage, setBulkDeleteUsage] = useState<MediaUsageResult | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)
  const { addToast } = useToast()

  const handleCopyUrl = async (file: MediaFile) => {
    try {
      await navigator.clipboard.writeText(file.url)
      setCopiedId(file.id)
      addToast('URLをコピーしました', 'success')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      addToast('コピーに失敗しました', 'error')
    }
  }

  const openDeleteDialog = async (file: MediaFile) => {
    setDeleteTarget(file)
    setIsCheckingUsage(true)
    const usage = await checkMediaUsage(file.url)
    setDeleteTargetUsage(usage)
    setIsCheckingUsage(false)
  }

  const closeDeleteDialog = () => {
    setDeleteTarget(null)
    setDeleteTargetUsage(null)
  }

  const handleDelete = async (file: MediaFile) => {
    setIsDeleting(true)
    const result = await deleteMediaFile(file.path, file.url)
    setIsDeleting(false)

    if (result.success) {
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
      setSelectedFiles((prev) => {
        const next = new Set(prev)
        next.delete(file.path)
        return next
      })
      if (result.clearedPosts && result.clearedPosts > 0) {
        addToast(`削除しました（${result.clearedPosts}件の記事のサムネイルをクリア）`, 'success')
      } else {
        addToast('削除しました', 'success')
      }
    } else {
      addToast(result.error || '削除に失敗しました', 'error')
    }
    closeDeleteDialog()
  }

  const openBulkDeleteDialog = async () => {
    setShowBulkDeleteDialog(true)
    setIsCheckingUsage(true)

    // Check usage for all selected files and merge details
    const mergedMap = new Map<string, { postId: string; title: string; usageTypes: Set<'thumbnail' | 'content'> }>()
    for (const path of selectedFiles) {
      const file = files.find(f => f.path === path)
      if (file) {
        const usage = await checkMediaUsage(file.url)
        for (const detail of usage.details) {
          const existing = mergedMap.get(detail.postId)
          if (existing) {
            for (const t of detail.usageTypes) existing.usageTypes.add(t)
          } else {
            mergedMap.set(detail.postId, {
              postId: detail.postId,
              title: detail.title,
              usageTypes: new Set(detail.usageTypes),
            })
          }
        }
      }
    }

    const details = Array.from(mergedMap.values()).map(d => ({
      postId: d.postId,
      title: d.title,
      usageTypes: Array.from(d.usageTypes) as ('thumbnail' | 'content')[],
    }))

    setBulkDeleteUsage({
      usedByPosts: details.length,
      postTitles: details.map(d => d.title),
      details,
    })
    setIsCheckingUsage(false)
  }

  const closeBulkDeleteDialog = () => {
    setShowBulkDeleteDialog(false)
    setBulkDeleteUsage(null)
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return

    setIsDeleting(true)
    const filesToDelete = files
      .filter(f => selectedFiles.has(f.path))
      .map(f => ({ path: f.path, url: f.url }))

    const result = await deleteMultipleMediaFiles(filesToDelete)
    setIsDeleting(false)

    if (result.success) {
      setFiles((prev) => prev.filter((f) => !selectedFiles.has(f.path)))
      setSelectedFiles(new Set())
      if (result.clearedPosts && result.clearedPosts > 0) {
        addToast(`${filesToDelete.length}件のファイルを削除しました（${result.clearedPosts}件の記事のサムネイルをクリア）`, 'success')
      } else {
        addToast(`${filesToDelete.length}件のファイルを削除しました`, 'success')
      }
    } else {
      addToast(result.error || '削除に失敗しました', 'error')
    }
    closeBulkDeleteDialog()
  }

  const toggleSelect = (path: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map((f) => f.path)))
    }
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-border-decorative">
        <p className="text-text-secondary">アップロードされた画像がありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-border-decorative p-4">
        <div className="flex items-center gap-4">
          <Checkbox
            id="select-all"
            checked={selectedFiles.size === files.length && files.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <label htmlFor="select-all" className="text-sm text-text-secondary cursor-pointer">
            すべて選択 ({selectedFiles.size}/{files.length})
          </label>
        </div>
        {selectedFiles.size > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={openBulkDeleteDialog}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            選択した画像を削除 ({selectedFiles.size})
          </Button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              'group relative bg-white rounded-lg border overflow-hidden transition-all',
              selectedFiles.has(file.path)
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border-decorative hover:border-primary/50'
            )}
          >
            {/* Checkbox */}
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedFiles.has(file.path)}
                onCheckedChange={() => toggleSelect(file.path)}
                className="bg-white/80 backdrop-blur-sm"
              />
            </div>

            {/* Image */}
            <div className="relative aspect-square bg-gray-100">
              <Image
                src={file.url}
                alt={file.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
            </div>

            {/* Info & Actions */}
            <div className="p-3">
              <p className="text-xs text-text-primary truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {formatFileSize(file.size)} • {formatDate(file.createdAt)}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleCopyUrl(file)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  title="URLをコピー"
                >
                  {copiedId === file.id ? (
                    <>
                      <Check className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">コピー済</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>URL</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => openDeleteDialog(file)}
                  className="flex items-center justify-center px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
                  title="削除"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Single Delete Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>画像を削除</DialogTitle>
          </DialogHeader>
          {isCheckingUsage ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
              <span className="ml-2 text-text-secondary">使用状況を確認中...</span>
            </div>
          ) : (
            <>
              <p className="text-text-secondary">
                「{deleteTarget?.name}」を削除しますか？この操作は取り消せません。
              </p>
              {deleteTargetUsage && deleteTargetUsage.usedByPosts > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-amber-800 text-sm font-medium">
                    この画像は {deleteTargetUsage.usedByPosts}件の記事で使用されています
                  </p>
                  <p className="text-amber-700 text-xs mt-1">
                    削除すると、該当箇所の画像が表示されなくなります：
                  </p>
                  <ul className="text-amber-700 text-xs mt-2 space-y-1">
                    {deleteTargetUsage.details.slice(0, 5).map((detail) => (
                      <li key={detail.postId} className="flex items-start gap-1">
                        <span className="shrink-0">•</span>
                        <span>
                          <span className="font-medium">{detail.title}</span>
                          <span className="text-amber-600 ml-1">
                            ({detail.usageTypes.map(t => t === 'thumbnail' ? 'サムネイル' : '記事本文').join('・')})
                          </span>
                        </span>
                      </li>
                    ))}
                    {deleteTargetUsage.details.length > 5 && (
                      <li className="flex items-start gap-1">
                        <span className="shrink-0">•</span>
                        <span>他 {deleteTargetUsage.details.length - 5} 件...</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
              {deleteTarget && (
                <div className="relative aspect-video w-full max-w-[200px] mx-auto rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={deleteTarget.url}
                    alt={deleteTarget.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} disabled={isDeleting || isCheckingUsage}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={isDeleting || isCheckingUsage}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  削除中...
                </>
              ) : (
                '削除する'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={closeBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>複数の画像を削除</DialogTitle>
          </DialogHeader>
          {isCheckingUsage ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
              <span className="ml-2 text-text-secondary">使用状況を確認中...</span>
            </div>
          ) : (
            <>
              <p className="text-text-secondary">
                選択した{selectedFiles.size}件の画像を削除しますか？この操作は取り消せません。
              </p>
              {bulkDeleteUsage && bulkDeleteUsage.usedByPosts > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-amber-800 text-sm font-medium">
                    選択した画像は合計 {bulkDeleteUsage.usedByPosts}件の記事で使用されています
                  </p>
                  <p className="text-amber-700 text-xs mt-1">
                    削除すると、該当箇所の画像が表示されなくなります：
                  </p>
                  <ul className="text-amber-700 text-xs mt-2 space-y-1">
                    {bulkDeleteUsage.details.slice(0, 5).map((detail) => (
                      <li key={detail.postId} className="flex items-start gap-1">
                        <span className="shrink-0">•</span>
                        <span>
                          <span className="font-medium">{detail.title}</span>
                          <span className="text-amber-600 ml-1">
                            ({detail.usageTypes.map(t => t === 'thumbnail' ? 'サムネイル' : '記事本文').join('・')})
                          </span>
                        </span>
                      </li>
                    ))}
                    {bulkDeleteUsage.details.length > 5 && (
                      <li className="flex items-start gap-1">
                        <span className="shrink-0">•</span>
                        <span>他 {bulkDeleteUsage.details.length - 5} 件...</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeBulkDeleteDialog} disabled={isDeleting || isCheckingUsage}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkDelete}
              disabled={isDeleting || isCheckingUsage}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  削除中...
                </>
              ) : (
                `${selectedFiles.size}件を削除`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
