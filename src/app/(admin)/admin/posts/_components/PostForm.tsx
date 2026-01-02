'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Card } from '@/components/ui/Card'
import { RichTextEditor } from '@/components/admin/editor/RichTextEditor'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { createPost, updatePost, PostFormData } from '../actions'
import { ArrowLeft, Save, Eye } from 'lucide-react'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  slug: string
}

interface Hashtag {
  id: string
  name: string
  slug: string
}

interface PostFormProps {
  mode: 'create' | 'edit'
  categories: Category[]
  hashtags: Hashtag[]
  initialData?: {
    id: string
    title: string
    slug: string
    content: string
    excerpt: string | null
    thumbnail_url: string | null
    is_published: boolean
    published_at: string | null
    post_categories?: Array<{ categories: Category }>
    post_hashtags?: Array<{ hashtags: Hashtag }>
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, '')
    .slice(0, 100)
}

export function PostForm({
  mode,
  categories,
  hashtags,
  initialData,
}: PostFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState(initialData?.title || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    initialData?.thumbnail_url || null
  )
  const [categoryId, setCategoryId] = useState<string>(
    initialData?.post_categories?.[0]?.categories?.id || ''
  )
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>(
    initialData?.post_hashtags?.map((ph) => ph.hashtags.id) || []
  )
  const [isPublished, setIsPublished] = useState(
    initialData?.is_published || false
  )
  const [publishedAt, setPublishedAt] = useState(
    initialData?.published_at
      ? new Date(initialData.published_at).toISOString().slice(0, 16)
      : ''
  )

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    if (!initialData) {
      setSlug(generateSlug(newTitle))
    }
  }

  const toggleHashtag = (hashtagId: string) => {
    setSelectedHashtags((prev) =>
      prev.includes(hashtagId)
        ? prev.filter((id) => id !== hashtagId)
        : [...prev, hashtagId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    if (!title.trim()) {
      setError('タイトルを入力してください')
      setIsSubmitting(false)
      return
    }

    if (!slug.trim()) {
      setError('スラッグを入力してください')
      setIsSubmitting(false)
      return
    }

    if (!categoryId) {
      setError('カテゴリを選択してください')
      setIsSubmitting(false)
      return
    }

    const formData: PostFormData = {
      title: title.trim(),
      slug: slug.trim(),
      content,
      excerpt: excerpt.trim(),
      thumbnail_url: thumbnailUrl,
      category_id: categoryId || null,
      hashtag_ids: selectedHashtags,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
      is_published: isPublished,
    }

    try {
      const result =
        mode === 'create'
          ? await createPost(formData)
          : await updatePost(initialData!.id, formData)

      if (!result.success) {
        setError(result.error || '保存に失敗しました')
        return
      }

      router.push('/admin/posts')
      router.refresh()
    } catch {
      setError('エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/posts"
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">
            {mode === 'create' ? '新規記事作成' : '記事を編集'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {mode === 'edit' && initialData && categoryId && (
            <Link
              href={`/${categories.find((c) => c.id === categoryId)?.slug}/${slug}`}
              target="_blank"
            >
              <Button type="button" variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                プレビュー
              </Button>
            </Link>
          )}
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <Card className="p-6 bg-white">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">タイトル *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="記事のタイトル"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">スラッグ *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-friendly-slug"
                  required
                />
                <p className="text-xs text-text-secondary">
                  URLに使用されます: /{categories.find((c) => c.id === categoryId)?.slug || 'category'}/{slug || 'slug'}
                </p>
              </div>
            </div>
          </Card>

          {/* Content */}
          <Card className="p-6 bg-white">
            <div className="space-y-2">
              <Label>本文</Label>
              <RichTextEditor
                content={content}
                onChange={setContent}
              />
            </div>
          </Card>

          {/* Excerpt */}
          <Card className="p-6 bg-white">
            <div className="space-y-2">
              <Label htmlFor="excerpt">抜粋</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="記事の概要（150文字程度）"
                rows={3}
              />
              <p className="text-xs text-text-secondary">
                {excerpt.length} / 150 文字
              </p>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <Card className="p-6 bg-white">
            <h3 className="font-semibold text-text-primary mb-4">公開設定</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="is_published"
                  checked={isPublished}
                  onCheckedChange={(checked) => setIsPublished(checked)}
                />
                <Label htmlFor="is_published" className="cursor-pointer">
                  公開する
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="published_at">公開日時</Label>
                <Input
                  id="published_at"
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Thumbnail */}
          <Card className="p-6 bg-white">
            <h3 className="font-semibold text-text-primary mb-4">
              サムネイル画像
            </h3>
            <ImageUploader
              value={thumbnailUrl}
              onChange={setThumbnailUrl}
            />
          </Card>

          {/* Category */}
          <Card className="p-6 bg-white">
            <h3 className="font-semibold text-text-primary mb-4">
              カテゴリ *
            </h3>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">選択してください</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </Card>

          {/* Hashtags */}
          <Card className="p-6 bg-white">
            <h3 className="font-semibold text-text-primary mb-4">
              ハッシュタグ
            </h3>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {hashtags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleHashtag(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedHashtags.includes(tag.id)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
            {selectedHashtags.length > 0 && (
              <p className="text-xs text-text-secondary mt-2">
                {selectedHashtags.length} 件選択中
              </p>
            )}
          </Card>
        </div>
      </div>
    </form>
  )
}
