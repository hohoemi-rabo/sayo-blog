'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { SpotFieldArray } from './SpotFieldArray'
import { ArticlePreview } from './ArticlePreview'
import { createKnowledge, updateKnowledge, generateDraft } from '../actions'
import type { KnowledgeMetadata, KnowledgeSpot } from '@/lib/types'
import type { KnowledgeDetail } from '../actions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PostOption = Record<string, any> & {
  id: string
  title: string
  slug: string
  content: string
  published_at: string | null
  updated_at: string
}

interface KnowledgeFormProps {
  mode: 'create' | 'edit'
  categories: Array<{ id: string; name: string; slug: string }>
  initialData?: KnowledgeDetail
  availablePosts?: PostOption[]
  preselectedPostId?: string
}

export function KnowledgeForm({
  mode,
  categories,
  initialData,
  availablePosts,
  preselectedPostId,
}: KnowledgeFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Post selection (create mode)
  const [selectedPostId, setSelectedPostId] = useState(preselectedPostId || '')
  const selectedPost = availablePosts?.find((p) => p.id === selectedPostId)

  // Metadata fields
  const [title, setTitle] = useState(initialData?.metadata.title || '')
  const [category, setCategory] = useState(initialData?.metadata.category || '')
  const [area, setArea] = useState(initialData?.metadata.area || '')
  const [summary, setSummary] = useState(initialData?.metadata.summary || '')
  const [keywords, setKeywords] = useState(
    initialData?.metadata.keywords?.join(', ') || ''
  )
  const [hashtags, setHashtags] = useState(
    initialData?.metadata.hashtags?.join(', ') || ''
  )
  const [publishedAt, setPublishedAt] = useState(
    initialData?.metadata.published_at || ''
  )
  const [spots, setSpots] = useState<KnowledgeSpot[]>(
    initialData?.metadata.spots || []
  )

  // Content
  const [content, setContent] = useState(initialData?.content || '')

  // Active toggle
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true)

  // AI draft generation
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)

  // When a post is selected in create mode, auto-fill metadata
  const handlePostSelect = (postId: string) => {
    setSelectedPostId(postId)
    const post = availablePosts?.find((p) => p.id === postId)
    if (post) {
      setTitle(post.title)
      const cats = post.post_categories as Array<{ categories: { slug: string } }> | null
      setCategory(cats?.[0]?.categories?.slug || '')
      const tagEntries = post.post_hashtags as Array<{ hashtags: { name: string } }> | null
      const tags = tagEntries?.map((ph) => ph.hashtags?.name).filter(Boolean) || []
      setHashtags(tags.join(', '))
      setPublishedAt(
        post.published_at
          ? new Date(post.published_at).toISOString().slice(0, 10)
          : ''
      )
    }
  }

  const postIdForGeneration = mode === 'edit' ? initialData!.post_id : selectedPostId

  const handleGenerateDraft = async () => {
    if (!postIdForGeneration) return
    setIsGeneratingDraft(true)
    setError(null)

    try {
      const result = await generateDraft(postIdForGeneration)
      if (result.success && result.metadata && result.content) {
        setTitle(result.metadata.title)
        setCategory(result.metadata.category)
        setArea(result.metadata.area)
        setSummary(result.metadata.summary)
        setKeywords(result.metadata.keywords.join(', '))
        setHashtags(result.metadata.hashtags.join(', '))
        setPublishedAt(
          result.metadata.published_at
            ? new Date(result.metadata.published_at).toISOString().slice(0, 10)
            : ''
        )
        setSpots(result.metadata.spots || [])
        setContent(result.content)
      } else {
        setError(result.error || 'AI 生成に失敗しました')
      }
    } catch {
      setError('AI 生成中にエラーが発生しました')
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    // Validation
    if (mode === 'create' && !selectedPostId) {
      setError('記事を選択してください')
      setIsSubmitting(false)
      return
    }
    if (!title.trim()) {
      setError('タイトルを入力してください')
      setIsSubmitting(false)
      return
    }
    if (!content.trim()) {
      setError('コンテンツを入力してください')
      setIsSubmitting(false)
      return
    }

    const metadata: KnowledgeMetadata = {
      title: title.trim(),
      category: category.trim(),
      hashtags: hashtags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      published_at: publishedAt,
      area: area.trim(),
      summary: summary.trim(),
      keywords: keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      spots: spots.filter((s) => s.name.trim() !== ''),
    }

    try {
      if (mode === 'create') {
        const post = availablePosts?.find((p) => p.id === selectedPostId)
        const result = await createKnowledge({
          post_id: selectedPostId,
          slug: post?.slug || '',
          metadata,
          content: content.trim(),
          is_active: isActive,
        })

        if (!result.success) {
          setError(result.error || '作成に失敗しました')
          setIsSubmitting(false)
          return
        }
      } else {
        const result = await updateKnowledge(initialData!.id, {
          metadata,
          content: content.trim(),
          is_active: isActive,
        })

        if (!result.success) {
          setError(result.error || '更新に失敗しました')
          setIsSubmitting(false)
          return
        }
      }

      router.push('/admin/ai/knowledge')
      router.refresh()
    } catch {
      setError('エラーが発生しました')
      setIsSubmitting(false)
    }
  }

  // Determine article preview content
  const previewTitle = mode === 'edit' ? initialData!.post.title : (selectedPost?.title || '')
  const previewContent = mode === 'edit' ? initialData!.post.content : (selectedPost?.content || '')
  const needsUpdate = mode === 'edit'
    ? new Date(initialData!.post.updated_at) > new Date(initialData!.updated_at)
    : false

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/ai/knowledge"
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">
            {mode === 'create' ? 'ナレッジ新規作成' : 'ナレッジ編集'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {postIdForGeneration && (
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateDraft}
              disabled={isGeneratingDraft}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isGeneratingDraft
                ? 'AI 生成中...'
                : mode === 'edit'
                  ? 'AI で再生成'
                  : 'AI で下書き生成'}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Post Selection (create mode only) */}
          {mode === 'create' && (
            <Card className="p-6 bg-white hover:scale-100">
              <div className="space-y-2">
                <Label>記事を選択 *</Label>
                <select
                  value={selectedPostId}
                  onChange={(e) => handlePostSelect(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
                >
                  <option value="">記事を選択してください</option>
                  {availablePosts?.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.title}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          )}

          {/* Metadata */}
          <Card className="p-6 bg-white hover:scale-100">
            <h3 className="font-semibold text-text-primary mb-4">メタデータ</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>タイトル *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>カテゴリ</Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
                  >
                    <option value="">選択してください</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>エリア</Label>
                  <Input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="例: 飯田市・中心部"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>要約</Label>
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  placeholder="記事の要約（2〜3文）"
                />
              </div>

              <div className="space-y-2">
                <Label>キーワード</Label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="カンマ区切り: ランチ, カフェ, 飯田市"
                />
              </div>

              <div className="space-y-2">
                <Label>ハッシュタグ</Label>
                <Input
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="カンマ区切り: グルメ, カフェ"
                />
              </div>

              <div className="space-y-2">
                <Label>公開日</Label>
                <Input
                  type="date"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Spots */}
          <Card className="p-6 bg-white hover:scale-100">
            <SpotFieldArray spots={spots} onChange={setSpots} />
          </Card>

          {/* Content */}
          <Card className="p-6 bg-white hover:scale-100">
            <div className="space-y-2">
              <Label>コンテンツ（構造化マークダウン）*</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="font-mono text-sm"
                placeholder="# 記事タイトル&#10;&#10;## 概要&#10;..."
              />
            </div>
          </Card>

          {/* Settings */}
          <Card className="p-6 bg-white hover:scale-100">
            <div className="flex items-center gap-3">
              <Checkbox
                id="is_active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                AI 検索対象に含める（有効）
              </Label>
            </div>
          </Card>
        </div>

        {/* Right: Preview */}
        <div>
          {previewContent ? (
            <ArticlePreview
              title={previewTitle}
              content={previewContent}
              needsUpdate={needsUpdate}
            />
          ) : (
            <div className="sticky top-24">
              <div className="bg-white rounded-lg border border-border-decorative p-8 text-center">
                <p className="text-text-secondary">
                  {mode === 'create'
                    ? '記事を選択するとプレビューが表示されます'
                    : '元記事のプレビュー'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
