'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Pencil, Trash2, FileText, Trash } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { deleteHashtag, deleteUnusedHashtags } from '../actions'

interface Hashtag {
  id: string
  name: string
  slug: string
  post_hashtags: { count: number }[] | { count: number }
}

interface HashtagListProps {
  hashtags: Hashtag[]
}

export function HashtagList({ hashtags }: HashtagListProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [hashtagToDelete, setHashtagToDelete] = useState<Hashtag | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleDeleteClick = (hashtag: Hashtag) => {
    setHashtagToDelete(hashtag)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!hashtagToDelete) return

    setIsDeleting(true)
    const result = await deleteHashtag(hashtagToDelete.id)
    setIsDeleting(false)

    if (result.success) {
      setDeleteDialogOpen(false)
      setHashtagToDelete(null)
      router.refresh()
    } else {
      alert('削除に失敗しました: ' + result.error)
    }
  }

  const handleBulkDeleteConfirm = async () => {
    setIsDeleting(true)
    const result = await deleteUnusedHashtags()
    setIsDeleting(false)

    if (result.success) {
      setBulkDeleteDialogOpen(false)
      setMessage(`${result.count} 件の未使用タグを削除しました`)
      router.refresh()
      setTimeout(() => setMessage(null), 3000)
    } else {
      alert('削除に失敗しました: ' + result.error)
    }
  }

  const getPostCount = (hashtag: Hashtag): number => {
    if (Array.isArray(hashtag.post_hashtags)) {
      return hashtag.post_hashtags[0]?.count || 0
    }
    return (hashtag.post_hashtags as { count: number })?.count || 0
  }

  const unusedCount = hashtags.filter((h) => getPostCount(h) === 0).length

  return (
    <>
      {message && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-600">
          {message}
        </div>
      )}

      {/* Bulk Delete Button */}
      {unusedCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="gap-2 text-red-500 border-red-200 hover:bg-red-50"
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Trash className="h-4 w-4" />
            未使用タグを一括削除 ({unusedCount}件)
          </Button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border-decorative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ハッシュタグ名</TableHead>
              <TableHead>スラッグ</TableHead>
              <TableHead className="w-24 text-right">使用記事数</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hashtags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-text-secondary">
                  ハッシュタグがありません
                </TableCell>
              </TableRow>
            ) : (
              hashtags.map((hashtag) => {
                const postCount = getPostCount(hashtag)
                return (
                  <TableRow key={hashtag.id}>
                    <TableCell className="font-medium text-text-primary">
                      #{hashtag.name}
                    </TableCell>
                    <TableCell className="text-text-secondary font-mono text-sm">
                      {hashtag.slug}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-text-secondary">
                        <FileText className="h-4 w-4" />
                        {postCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/hashtags/${hashtag.id}`}
                          className="p-2 hover:bg-gray-100 rounded-md"
                          title="編集"
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(hashtag)}
                          className="p-2 hover:bg-red-50 rounded-md"
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Single Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ハッシュタグを削除</DialogTitle>
            <DialogDescription>
              「#{hashtagToDelete?.name}」を削除してもよろしいですか？
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? '削除中...' : '削除する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>未使用タグを一括削除</DialogTitle>
            <DialogDescription>
              記事で使用されていない {unusedCount} 件のハッシュタグを削除しますか？
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? '削除中...' : '削除する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
