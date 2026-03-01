'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
import { deleteTag, toggleTagActive } from '../actions'

const TAG_TYPE_LABELS: Record<string, string> = {
  purpose: '目的',
  area: 'エリア',
  scene: 'シーン',
}

const TAG_TYPE_BADGE_STYLES: Record<string, string> = {
  purpose: 'bg-primary/10 text-primary',
  area: 'bg-blue-50 text-blue-600',
  scene: 'bg-green-50 text-green-600',
}

interface Tag {
  id: string
  label: string
  prompt: string
  tag_type: string
  order_num: number
  is_active: boolean
}

interface TagListProps {
  tags: Tag[]
}

export function TagList({ tags }: TagListProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleDeleteClick = (tag: Tag) => {
    setTagToDelete(tag)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return

    setIsDeleting(true)
    const result = await deleteTag(tagToDelete.id)
    setIsDeleting(false)

    if (result.success) {
      setDeleteDialogOpen(false)
      setTagToDelete(null)
      router.refresh()
    } else {
      alert('削除に失敗しました: ' + result.error)
    }
  }

  const handleToggleActive = async (tag: Tag) => {
    setTogglingId(tag.id)
    const result = await toggleTagActive(tag.id, !tag.is_active)
    setTogglingId(null)

    if (result.success) {
      router.refresh()
    } else {
      alert('更新に失敗しました: ' + result.error)
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-border-decorative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">順序</TableHead>
              <TableHead>ラベル</TableHead>
              <TableHead className="hidden md:table-cell">プロンプト</TableHead>
              <TableHead className="w-24">種別</TableHead>
              <TableHead className="w-20 text-center">有効</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                  タグがありません
                </TableCell>
              </TableRow>
            ) : (
              tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="text-text-secondary text-sm">
                    {tag.order_num}
                  </TableCell>
                  <TableCell className="font-medium text-text-primary">
                    {tag.label}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-text-secondary text-sm max-w-xs truncate">
                    {tag.prompt}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        TAG_TYPE_BADGE_STYLES[tag.tag_type] || TAG_TYPE_BADGE_STYLES.purpose
                      }`}
                    >
                      {TAG_TYPE_LABELS[tag.tag_type] || tag.tag_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggleActive(tag)}
                      disabled={togglingId === tag.id}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        tag.is_active ? 'bg-primary' : 'bg-gray-300'
                      } ${togglingId === tag.id ? 'opacity-50' : ''}`}
                      title={tag.is_active ? '無効にする' : '有効にする'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          tag.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/ai/tags/${tag.id}`}
                        className="p-2 hover:bg-gray-100 rounded-md"
                        title="編集"
                      >
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(tag)}
                        className="p-2 hover:bg-red-50 rounded-md"
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タグを削除</DialogTitle>
            <DialogDescription>
              「{tagToDelete?.label}」を削除してもよろしいですか？
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
    </>
  )
}
