'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { createTag, updateTag, TagFormData } from '../actions'

interface TagFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    id: string
    label: string
    prompt: string
    tag_type: string
    order_num: number
    is_active: boolean
  }
}

export function TagForm({ mode, initialData }: TagFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [label, setLabel] = useState(initialData?.label || '')
  const [prompt, setPrompt] = useState(initialData?.prompt || '')
  const [tagType, setTagType] = useState(initialData?.tag_type || 'purpose')
  const [orderNum, setOrderNum] = useState(initialData?.order_num ?? 0)
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    if (!label.trim()) {
      setError('ラベルを入力してください')
      setIsSubmitting(false)
      return
    }

    if (!prompt.trim()) {
      setError('プロンプトを入力してください')
      setIsSubmitting(false)
      return
    }

    const formData: TagFormData = {
      label: label.trim(),
      prompt: prompt.trim(),
      tag_type: tagType as 'purpose' | 'area' | 'scene',
      order_num: orderNum,
      is_active: isActive,
    }

    try {
      const result =
        mode === 'create'
          ? await createTag(formData)
          : await updateTag(initialData!.id, formData)

      if (!result.success) {
        setError(result.error || '保存に失敗しました')
        return
      }

      router.push('/admin/ai/tags')
      router.refresh()
    } catch {
      setError('エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/ai/tags"
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">
            {mode === 'create' ? '新規タグ作成' : 'タグを編集'}
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
              <Label htmlFor="label">ラベル *</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="例: ランチを探す"
                required
              />
              <p className="text-xs text-text-secondary">
                チャット画面に表示されるタグのテキスト
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">プロンプト *</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例: 飯田市でおすすめのランチスポットを教えて"
                rows={3}
                required
              />
              <p className="text-xs text-text-secondary">
                タグクリック時に AI に送信される質問文
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tag_type">種別 *</Label>
              <Select
                id="tag_type"
                value={tagType}
                onChange={(e) => setTagType(e.target.value)}
              >
                <option value="purpose">目的（purpose）</option>
                <option value="area">エリア（area）</option>
                <option value="scene">シーン（scene）</option>
              </Select>
              <p className="text-xs text-text-secondary">
                種別によりタグの色が変わります
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_num">表示順</Label>
              <Input
                id="order_num"
                type="number"
                value={orderNum}
                onChange={(e) => setOrderNum(parseInt(e.target.value) || 0)}
                min={0}
              />
              <p className="text-xs text-text-secondary">
                小さい数字ほど先に表示されます
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                id="is_active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked)}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                有効（チャット画面に表示する）
              </Label>
            </div>
          </div>
        </Card>
      </div>
    </form>
  )
}
