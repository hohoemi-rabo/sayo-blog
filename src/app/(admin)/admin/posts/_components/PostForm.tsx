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
import { ThumbnailSizeNotice } from './ThumbnailSizeNotice'
import { createPost, updatePost, PostFormData } from '../actions'
import type { ImportedOrigin, InquiryLink, RelatedPostOption } from '../actions'
import type { ArticleType } from '@/lib/types'
import { ArrowLeft, Save, Eye } from 'lucide-react'
import Link from 'next/link'
import {
  ARTICLE_TYPE_HINTS,
  ARTICLE_TYPE_LABELS,
  DEFAULT_NEW_ARTICLE_TYPE,
  NEW_ARTICLE_TYPES,
} from '@/lib/article-types'
import { IgPostsSection } from '@/components/admin/posts/IgPostsSection'
import { EventInfoSection, type EventInfoState } from './EventInfoSection'
import { SummarySection, type SummaryState } from './SummarySection'
import { RelatedPostsSection } from './RelatedPostsSection'
import type { IgPostWithRelations } from '@/lib/types'

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
    event_ended?: boolean
    published_at: string | null
    is_event?: boolean
    event_date_start?: string | null
    event_date_end?: string | null
    event_time_start?: string | null
    event_time_end?: string | null
    event_venue?: string | null
    event_address?: string | null
    event_fee?: string | null
    event_url?: string | null
    summary_short?: string | null
    summary_medium?: string | null
    summary_long?: string | null
    article_type?: ArticleType
    post_categories?: Array<{ categories: Category }>
    post_hashtags?: Array<{ hashtags: Hashtag }>
  }
  igSection?: {
    initialIgPosts: IgPostWithRelations[]
    totalIgPosts: number
    importedOrigin: ImportedOrigin | null
  }
  /**
   * 依頼との紐付け。create = 保存時に紐付ける依頼 (依頼管理の「自分で書く」等から来た)、
   * edit = すでに紐付いている依頼。どちらも記事の種類は依頼に合わせて固定する。
   */
  inquiryLink?: InquiryLink
  /** 保存済みの関連記事の手動選択 (表示順)。新規作成では無し */
  initialRelatedPosts?: RelatedPostOption[]
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
  igSection,
  inquiryLink,
  initialRelatedPosts,
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
  const [eventEnded, setEventEnded] = useState(
    initialData?.event_ended || false
  )
  const [publishedAt, setPublishedAt] = useState(
    initialData?.published_at
      ? new Date(initialData.published_at).toISOString().slice(0, 16)
      : ''
  )
  const [eventInfo, setEventInfo] = useState<EventInfoState>({
    is_event: initialData?.is_event ?? false,
    event_date_start: initialData?.event_date_start ?? null,
    event_date_end: initialData?.event_date_end ?? null,
    event_time_start: initialData?.event_time_start ?? null,
    event_time_end: initialData?.event_time_end ?? null,
    event_venue: initialData?.event_venue ?? null,
    event_address: initialData?.event_address ?? null,
    event_fee: initialData?.event_fee ?? null,
    event_url: initialData?.event_url ?? null,
  })
  // 記事の種類。依頼と紐付く記事は依頼に合わせて固定 (電話・DM など
  // フォームを通らない依頼は、ここで投稿記事 / 取材記事を選ぶ)
  // 自由記事は新しく作らないので、新規は 投稿 / 取材 の 2 択。
  // 既存の自由記事を編集するときだけ「自由記事」も残す (保存しても勝手に種類が変わらないように)
  const [articleType, setArticleType] = useState<ArticleType>(
    inquiryLink?.kind ?? initialData?.article_type ?? DEFAULT_NEW_ARTICLE_TYPE
  )
  const selectableArticleTypes: ArticleType[] =
    initialData?.article_type === 'free'
      ? [...NEW_ARTICLE_TYPES, 'free']
      : [...NEW_ARTICLE_TYPES]
  const [relatedPosts, setRelatedPosts] = useState<RelatedPostOption[]>(
    initialRelatedPosts ?? []
  )
  const [summary, setSummary] = useState<SummaryState>({
    summary_short: initialData?.summary_short ?? null,
    summary_medium: initialData?.summary_medium ?? null,
    summary_long: initialData?.summary_long ?? null,
  })

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
      event_ended: eventEnded,
      is_event: eventInfo.is_event,
      event_date_start: eventInfo.event_date_start,
      event_date_end: eventInfo.event_date_end,
      event_time_start: eventInfo.event_time_start,
      event_time_end: eventInfo.event_time_end,
      event_venue: eventInfo.event_venue,
      event_address: eventInfo.event_address,
      event_fee: eventInfo.event_fee,
      event_url: eventInfo.event_url,
      summary_short: summary.summary_short,
      summary_medium: summary.summary_medium,
      summary_long: summary.summary_long,
      article_type: articleType,
      related_post_ids: relatedPosts.map((p) => p.id),
    }

    try {
      const result =
        mode === 'create'
          ? await createPost(
              formData,
              inquiryLink
                ? { linkInquiry: { kind: inquiryLink.kind, id: inquiryLink.id } }
                : undefined
            )
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
      {/* 依頼管理から作成するときのバナー */}
      {mode === 'create' && inquiryLink && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm text-text-primary">
          <span className="font-medium text-primary">
            {inquiryLink.kind === 'mini' ? '📩' : '✍️'} {ARTICLE_TYPE_LABELS[inquiryLink.kind]}として作成
          </span>
          <span className="ml-2 break-all text-text-secondary">
            依頼 #{inquiryLink.id.slice(0, 8)} ・ {inquiryLink.label}
          </span>
          <p className="mt-1 text-xs text-text-secondary">
            保存すると、この依頼と紐付きます。
          </p>
        </div>
      )}

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
          {mode === 'edit' && initialData && (
            <Link
              href={`/admin/posts/${initialData.id}/preview`}
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
          <Card className="p-6 bg-white hover:shadow-decorative hover:scale-100">
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

              <div className="border-t border-border-decorative pt-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="event_ended"
                    checked={eventEnded}
                    onCheckedChange={(checked) => setEventEnded(checked)}
                  />
                  <Label htmlFor="event_ended" className="cursor-pointer">
                    イベント終了
                  </Label>
                </div>
                <p className="mt-2 pl-7 text-xs text-text-secondary">
                  ON にするとサムネイルが白黒になり、終了案内が表示されます。
                  イベント記事の開催回が過ぎた場合に使用してください。
                </p>
              </div>
            </div>
          </Card>

          {/* 記事の種類 (記事一覧のタブ・公開ページのバッジに使う) */}
          <Card className="p-6 bg-white">
            <h3 className="font-semibold text-text-primary mb-4">記事の種類</h3>
            {inquiryLink ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-text-primary">
                  {ARTICLE_TYPE_LABELS[inquiryLink.kind]}
                </p>
                <p className="text-xs text-text-secondary">
                  {mode === 'create' ? '依頼から作成するため' : '依頼と紐付いているため'}
                  、種類は変えられません。
                  {mode === 'edit' && (
                    <>
                      {' '}
                      <Link
                        href={`/admin/inquiries?tab=${inquiryLink.kind}&open=${inquiryLink.id}`}
                        className="text-primary hover:underline"
                      >
                        依頼を開く
                      </Link>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-3" role="radiogroup" aria-label="記事の種類">
                {selectableArticleTypes.map((type) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-start gap-3"
                  >
                    <input
                      type="radio"
                      name="article_type"
                      value={type}
                      checked={articleType === type}
                      onChange={() => setArticleType(type)}
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <span>
                      <span className="block text-sm font-medium text-text-primary">
                        {ARTICLE_TYPE_LABELS[type]}
                      </span>
                      <span className="block text-xs text-text-secondary">
                        {ARTICLE_TYPE_HINTS[type]}
                      </span>
                    </span>
                  </label>
                ))}
                <p className="border-t border-border-decorative pt-3 text-xs text-text-secondary">
                  投稿記事・取材記事は、公開ページの記事の上にバッジが出ます。
                </p>
              </div>
            )}
          </Card>

          {/* Event Info (Ticket 37) */}
          <EventInfoSection value={eventInfo} onChange={setEventInfo} />

          {/* AI 3段階要約 */}
          <SummarySection value={summary} onChange={setSummary} body={content} />

          {/* Thumbnail */}
          <Card className="p-6 bg-white">
            <h3 className="font-semibold text-text-primary mb-4">
              サムネイル画像
            </h3>
            <ImageUploader
              value={thumbnailUrl}
              onChange={setThumbnailUrl}
            />
            <ThumbnailSizeNotice url={thumbnailUrl} />
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

          {/* 関連記事 (Ticket 45) */}
          <RelatedPostsSection
            value={relatedPosts}
            onChange={setRelatedPosts}
            postId={initialData?.id}
            categoryId={categoryId || null}
            hashtagIds={selectedHashtags}
          />

          {mode === 'edit' && initialData && igSection && (
            <IgPostsSection
              postId={initialData.id}
              postTitle={initialData.title}
              initialIgPosts={igSection.initialIgPosts}
              totalIgPosts={igSection.totalIgPosts}
              importedOrigin={igSection.importedOrigin}
            />
          )}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-border-decorative">
        {/* 公開 URL ではなく管理用プレビューへ (公開 URL だと下書きは 404 になる。上のボタンと同じ) */}
        {mode === 'edit' && initialData && (
          <Link href={`/admin/posts/${initialData.id}/preview`} target="_blank">
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
    </form>
  )
}
