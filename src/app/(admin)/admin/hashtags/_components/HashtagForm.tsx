'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card } from '@/components/ui/Card'
import { createHashtag, updateHashtag, HashtagFormData } from '../actions'

interface HashtagFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    slug: string
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, '')
    .slice(0, 100)
}

export function HashtagForm({ mode, initialData }: HashtagFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initialData?.name || '')
  const [slug, setSlug] = useState(initialData?.slug || '')

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)
    if (!initialData) {
      setSlug(generateSlug(newName))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    if (!name.trim()) {
      setError('ハッシュタグ名を入力してください')
      setIsSubmitting(false)
      return
    }

    if (!slug.trim()) {
      setError('スラッグを入力してください')
      setIsSubmitting(false)
      return
    }

    const formData: HashtagFormData = {
      name: name.trim(),
      slug: slug.trim(),
    }

    try {
      const result =
        mode === 'create'
          ? await createHashtag(formData)
          : await updateHashtag(initialData!.id, formData)

      if (!result.success) {
        setError(result.error || '保存に失敗しました')
        return
      }

      router.push('/admin/hashtags')
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
            href="/admin/hashtags"
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">
            {mode === 'create' ? '新規ハッシュタグ作成' : 'ハッシュタグを編集'}
          </h1>
        </div>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          <Save className="h-4 w-4" />
          {isSubmitting ? '保存中...' : '保存'}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      )}

      <div className="max-w-2xl">
        <Card className="p-6 bg-white">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">ハッシュタグ名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={handleNameChange}
                placeholder="例: 飯田市"
                required
              />
              <p className="text-xs text-text-secondary">
                「#」は自動的に付加されます
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">スラッグ *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="例: iida-city"
                required
              />
              <p className="text-xs text-text-secondary">
                URLに使用されます: /hashtags/{slug || 'slug'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </form>
  )
}
