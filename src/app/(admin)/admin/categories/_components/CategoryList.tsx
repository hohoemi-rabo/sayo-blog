'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Pencil, Trash2, FileText } from 'lucide-react'
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
import { deleteCategory } from '../actions'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  order_num: number
  post_categories: { count: number }[] | { count: number }
}

interface CategoryListProps {
  categories: Category[]
}

export function CategoryList({ categories }: CategoryListProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category)
    setError(null)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return

    setIsDeleting(true)
    setError(null)

    const result = await deleteCategory(categoryToDelete.id)

    if (result.success) {
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
      router.refresh()
    } else {
      setError(result.error || '削除に失敗しました')
    }

    setIsDeleting(false)
  }

  const getPostCount = (category: Category): number => {
    if (Array.isArray(category.post_categories)) {
      return category.post_categories[0]?.count || 0
    }
    return (category.post_categories as { count: number })?.count || 0
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-border-decorative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">順番</TableHead>
              <TableHead>カテゴリ名</TableHead>
              <TableHead>スラッグ</TableHead>
              <TableHead>説明</TableHead>
              <TableHead className="w-24 text-right">記事数</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                  カテゴリがありません
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="text-center font-medium">
                    {category.order_num}
                  </TableCell>
                  <TableCell className="font-medium text-text-primary">
                    {category.name}
                  </TableCell>
                  <TableCell className="text-text-secondary font-mono text-sm">
                    /{category.slug}/
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary max-w-xs truncate">
                    {category.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-text-secondary">
                      <FileText className="h-4 w-4" />
                      {getPostCount(category)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/categories/${category.id}`}
                        className="p-2 hover:bg-gray-100 rounded-md"
                        title="編集"
                      >
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(category)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリを削除</DialogTitle>
            <DialogDescription>
              「{categoryToDelete?.name}」を削除してもよろしいですか？
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
