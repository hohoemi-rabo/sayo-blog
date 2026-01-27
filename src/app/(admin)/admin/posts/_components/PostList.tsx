'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Pencil, Trash2, Eye, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
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
import { deletePost } from '../actions'

interface Category {
  id: string
  name: string
  slug: string
}

type Post = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  thumbnail_url: string | null
  is_published: boolean
  published_at: string | null
  view_count: number
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post_categories: any
}

interface PostListProps {
  posts: Post[]
  categories: Category[]
  filter: {
    category?: string
    status?: string
  }
}

export function PostList({
  posts,
  categories,
  filter,
}: PostListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // Reset page when filter changes
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const handleDeleteClick = (post: Post) => {
    setPostToDelete(post)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return

    setIsDeleting(true)
    const result = await deletePost(postToDelete.id)
    setIsDeleting(false)

    if (result.success) {
      setDeleteDialogOpen(false)
      setPostToDelete(null)
      router.refresh()
    } else {
      alert('削除に失敗しました: ' + result.error)
    }
  }

  const getCategoryForPost = (post: Post): Category | null => {
    const postCategory = post.post_categories?.[0]
    return postCategory?.categories || null
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="w-48">
          <Select
            value={filter.category || ''}
            onChange={(e) => updateFilter('category', e.target.value)}
          >
            <option value="">すべてのカテゴリ</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-36">
          <Select
            value={filter.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="published">公開</option>
            <option value="draft">下書き</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-border-decorative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">画像</TableHead>
              <TableHead>タイトル</TableHead>
              <TableHead className="w-32">カテゴリ</TableHead>
              <TableHead className="w-24">状態</TableHead>
              <TableHead className="w-32">公開日</TableHead>
              <TableHead className="w-20 text-right">閲覧数</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-text-secondary">
                  記事がありません
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => {
                const category = getCategoryForPost(post)
                return (
                  <TableRow key={post.id}>
                    <TableCell>
                      {post.thumbnail_url ? (
                        <div className="relative w-12 h-12 rounded overflow-hidden">
                          <Image
                            src={post.thumbnail_url}
                            alt={post.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No img</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/posts/${post.id}`}
                        className="font-medium text-text-primary hover:text-primary"
                      >
                        {post.title}
                      </Link>
                      <p className="text-xs text-text-secondary mt-1 truncate max-w-md">
                        {post.excerpt || 'No excerpt'}
                      </p>
                    </TableCell>
                    <TableCell>
                      {category ? (
                        <span className="text-sm text-text-secondary">
                          {category.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">未設定</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          post.is_published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {post.is_published ? '公開' : '下書き'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString('ja-JP')
                        : '未設定'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-text-secondary">
                      <div className="flex items-center justify-end gap-1">
                        <Eye className="h-3 w-3" />
                        {post.view_count?.toLocaleString() || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {post.is_published && category && (
                          <Link
                            href={`/${category.slug}/${post.slug}`}
                            target="_blank"
                            className="p-2 hover:bg-gray-100 rounded-md"
                            title="サイトで見る"
                          >
                            <ExternalLink className="h-4 w-4 text-gray-500" />
                          </Link>
                        )}
                        <Link
                          href={`/admin/posts/${post.id}`}
                          className="p-2 hover:bg-gray-100 rounded-md"
                          title="編集"
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(post)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>記事を削除</DialogTitle>
            <DialogDescription>
              「{postToDelete?.title}」を削除してもよろしいですか？
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
    </div>
  )
}
