'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Card } from '@/components/ui/Card'
import { createCategory, updateCategory, CategoryFormData } from '../actions'

interface CategoryFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    slug: string
    description: string | null
    order_num: number
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50)
}

export function CategoryForm({ mode, initialData }: CategoryFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initialData?.name || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [orderNum, setOrderNum] = useState(initialData?.order_num || 1)

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
      setError('カテゴリ名を入力してください')
      setIsSubmitting(false)
      return
    }

    if (!slug.trim()) {
      setError('スラッグを入力してください')
      setIsSubmitting(false)
      return
    }

    const formData: CategoryFormData = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      order_num: orderNum,
    }

    try {
      const result =
        mode === 'create'
          ? await createCategory(formData)
          : await updateCategory(initialData!.id, formData)

      if (!result.success) {
        setError(result.error || '保存に失敗しました')
        return
      }

      router.push('/admin/categories')
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
            href="/admin/categories"
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">
            {mode === 'create' ? '新規カテゴリ作成' : 'カテゴリを編集'}
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
              <Label htmlFor="name">カテゴリ名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={handleNameChange}
                placeholder="例: グルメ・ランチ"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">スラッグ *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="例: gourmet"
                required
              />
              <p className="text-xs text-text-secondary">
                URLに使用されます: /{slug || 'slug'}/
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="カテゴリの説明"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_num">表示順</Label>
              <Input
                id="order_num"
                type="number"
                value={orderNum}
                onChange={(e) => setOrderNum(parseInt(e.target.value) || 1)}
                min={1}
                className="w-24"
              />
              <p className="text-xs text-text-secondary">
                数字が小さいほど上に表示されます
              </p>
            </div>
          </div>
        </Card>
      </div>
    </form>
  )
}
