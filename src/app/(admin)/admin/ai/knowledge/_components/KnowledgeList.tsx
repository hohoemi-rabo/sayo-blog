'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Pencil, Trash2, AlertTriangle, Check, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/Table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { deleteKnowledge } from '../actions'
import type { KnowledgeListItem } from '../actions'

interface KnowledgeListProps {
  items: KnowledgeListItem[]
  filter: {
    status?: string
    needsUpdate?: boolean
  }
}

export function KnowledgeList({ items, filter }: KnowledgeListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<KnowledgeListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleDeleteClick = (item: KnowledgeListItem) => {
    setItemToDelete(item)
    setError(null)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete?.id) return
    setIsDeleting(true)
    setError(null)

    const result = await deleteKnowledge(itemToDelete.id)

    if (result.success) {
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      router.refresh()
    } else {
      setError(result.error || '削除に失敗しました')
    }

    setIsDeleting(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select
          value={filter.status || ''}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="h-10 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
        >
          <option value="">すべて</option>
          <option value="active">有効</option>
          <option value="inactive">無効</option>
          <option value="none">未作成</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={filter.needsUpdate || false}
            onChange={(e) => updateFilter('needsUpdate', e.target.checked ? 'true' : '')}
            className="rounded border-border-decorative"
          />
          要更新のみ
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-border-decorative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>記事タイトル</TableHead>
              <TableHead className="w-28">カテゴリ</TableHead>
              <TableHead className="w-24">ステータス</TableHead>
              <TableHead className="w-28">Embedding</TableHead>
              <TableHead className="w-28">最終更新</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                  該当するデータがありません
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.post_id}>
                  {/* Title + needs update badge */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary line-clamp-1">
                        {item.post_title}
                      </span>
                      {item.needs_update && (
                        <Badge className="bg-amber-100 text-amber-700 shrink-0">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          要更新
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    <span className="text-text-secondary text-sm">
                      {item.category_slug || '-'}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {item.id === null ? (
                      <span className="text-text-secondary text-sm">未作成</span>
                    ) : item.is_active ? (
                      <Badge className="bg-green-100 text-green-700">
                        <Check className="h-3 w-3 mr-1" />
                        有効
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600">
                        <X className="h-3 w-3 mr-1" />
                        無効
                      </Badge>
                    )}
                  </TableCell>

                  {/* Embedding */}
                  <TableCell>
                    {item.id === null ? (
                      <span className="text-text-secondary text-sm">-</span>
                    ) : item.has_embedding ? (
                      <Badge className="bg-blue-100 text-blue-700">
                        <Zap className="h-3 w-3 mr-1" />
                        あり
                      </Badge>
                    ) : (
                      <span className="text-text-secondary text-sm">なし</span>
                    )}
                  </TableCell>

                  {/* Updated at */}
                  <TableCell>
                    <span className="text-text-secondary text-sm">
                      {formatDate(item.knowledge_updated_at)}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.id ? (
                        <>
                          <Link
                            href={`/admin/ai/knowledge/${item.id}`}
                            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                            title="編集"
                          >
                            <Pencil className="h-4 w-4 text-gray-500" />
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="p-2 rounded-md hover:bg-red-50 transition-colors"
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </>
                      ) : (
                        <Link
                          href={`/admin/ai/knowledge/new?post_id=${item.post_id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          作成
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ナレッジを削除</DialogTitle>
            <DialogDescription>
              「{itemToDelete?.post_title}」のナレッジを削除してもよろしいですか？
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? '削除中...' : '削除する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
