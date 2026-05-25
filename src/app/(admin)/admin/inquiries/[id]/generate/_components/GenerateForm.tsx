'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Sparkles, X } from 'lucide-react'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import {
  INQUIRY_IMAGE_ACCEPT,
  INQUIRY_IMAGE_MAX_BYTES,
} from '@/lib/inquiry-schema'
import { uploadAdditionalInquiryImages } from '../../../actions'

const ACCEPT_ATTR = INQUIRY_IMAGE_ACCEPT.join(',')
const ADDITIONAL_IMAGE_MAX_COUNT = 8

interface Props {
  inquiryId: string
  snsUrls: string[]
}

export function GenerateForm({ inquiryId, snsUrls }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [texts, setTexts] = useState<string[]>(() => snsUrls.map(() => ''))
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  function updateText(index: number, value: string) {
    setTexts((prev) => prev.map((t, i) => (i === index ? value : t)))
  }

  function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    setImages((prev) => {
      const merged = [...prev]
      for (const f of picked) {
        if (merged.length >= ADDITIONAL_IMAGE_MAX_COUNT) break
        if (f.size > INQUIRY_IMAGE_MAX_BYTES) continue
        if (!INQUIRY_IMAGE_ACCEPT.includes(f.type as (typeof INQUIRY_IMAGE_ACCEPT)[number]))
          continue
        merged.push(f)
      }
      return merged
    })
  }
  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleGenerate() {
    if (texts.every((t) => t.trim() === '')) {
      addToast('SNS 投稿の本文を 1 つ以上貼り付けてください', 'warning')
      return
    }
    setLoading(true)
    try {
      // 1. 追加画像があれば先にアップロード
      let additionalImageUrls: string[] = []
      if (images.length > 0) {
        const fd = new FormData()
        images.forEach((f) => fd.append('images', f))
        const up = await uploadAdditionalInquiryImages(inquiryId, fd)
        if (!up.ok) {
          addToast(up.error, 'error')
          setLoading(false)
          return
        }
        additionalImageUrls = up.urls
      }

      // 2. 生成 API を呼ぶ
      const snsTexts = snsUrls.map((url, i) => ({ url, text: texts[i] ?? '' }))
      const res = await fetch(`/api/admin/inquiries/${inquiryId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snsTexts, additionalImageUrls }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        addToast('たたき台を生成しました', 'success')
        router.push(json.redirect as string)
        return
      }
      addToast(json.error ?? '記事生成に失敗しました', 'error')
    } catch (err) {
      console.error(err)
      addToast('記事生成中にエラーが発生しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* SNS 投稿テキストの貼り付け */}
      <section className="rounded-xl border border-border-decorative bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-text-primary">
          SNS 投稿テキストを貼り付け
        </h2>
        <p className="mb-4 text-xs text-text-secondary">
          各 URL を開いて、投稿本文をコピーして貼り付けてください。
        </p>
        <div className="space-y-4">
          {snsUrls.map((url, i) => (
            <div key={i}>
              <label className="mb-1.5 block break-all text-xs text-text-secondary">
                URL {i + 1}: {url}
              </label>
              <Textarea
                value={texts[i]}
                onChange={(e) => updateText(i, e.target.value)}
                rows={4}
                placeholder="ここに投稿本文を貼り付け"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 追加画像 */}
      <section className="rounded-xl border border-border-decorative bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-text-primary">
          追加画像（任意・最大 {ADDITIONAL_IMAGE_MAX_COUNT} 枚）
        </h2>
        <p className="mb-4 text-xs text-text-secondary">
          SNS のスクリーンショットなどをここに追加できます（フォーム提供画像と合わせて本文に挿入されます）。
        </p>
        {images.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-3">
            {images.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="relative h-24 w-24 overflow-hidden rounded-lg border border-border-decorative"
              >
                {/* プレビューは object URL のため next/image を使わない */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  aria-label="画像を削除"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {images.length < ADDITIONAL_IMAGE_MAX_COUNT && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border-decorative px-4 py-3 text-sm text-text-secondary hover:border-primary hover:text-primary">
            <ImagePlus className="h-4 w-4" />
            画像を追加
            <input
              type="file"
              accept={ACCEPT_ATTR}
              multiple
              onChange={onPickImages}
              className="sr-only"
            />
          </label>
        )}
      </section>

      {/* アクション */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleGenerate}
          disabled={loading}
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          {loading ? '生成中…' : 'AI でたたき台を生成する'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/inquiries?tab=mini')}
          disabled={loading}
        >
          キャンセル
        </Button>
      </div>
    </div>
  )
}
