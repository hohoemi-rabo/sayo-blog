'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, ImagePlus } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'
import {
  MINI_INQUIRY_TYPE_LABELS,
  PUBLISH_PREFERENCE_LABELS,
} from '@/lib/inquiries'
import {
  INQUIRY_IMAGE_ACCEPT,
  INQUIRY_IMAGE_MAX_BYTES,
  INQUIRY_IMAGE_MAX_COUNT,
  MINI_INQUIRY_TYPES,
  PUBLISH_PREFERENCES,
} from '@/lib/inquiry-schema'
import type { MiniInquiryType, PublishPreference } from '@/lib/types'
import { submitMiniInquiry } from '../actions'

const ACCEPT_ATTR = INQUIRY_IMAGE_ACCEPT.join(',')

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-sm text-red-600">{message}</p>
}

function todayPlus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function MiniRequestForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const [urls, setUrls] = useState<string[]>([''])
  const [inquiryType, setInquiryType] = useState<MiniInquiryType | ''>('')
  const [pref, setPref] = useState<PublishPreference | ''>('')
  const [images, setImages] = useState<File[]>([])
  const [consent, setConsent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const previews = useMemo(
    () => images.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [images]
  )

  const minDate = todayPlus(1)
  const minMonth = currentMonth()

  function updateUrl(index: number, value: string) {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)))
  }
  function addUrl() {
    setUrls((prev) => (prev.length < 5 ? [...prev, ''] : prev))
  }
  function removeUrl(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index))
  }

  function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = '' // 同じファイルを選び直せるように
    setImages((prev) => {
      const merged = [...prev]
      for (const f of picked) {
        if (merged.length >= INQUIRY_IMAGE_MAX_COUNT) break
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setGeneralError(null)
    setFieldErrors({})

    const form = e.currentTarget
    const fd = new FormData(form)
    // URL は state から (動的フィールドのため確実に同期)
    fd.delete('sns_urls')
    urls.forEach((u) => {
      if (u.trim() !== '') fd.append('sns_urls', u.trim())
    })
    // 画像も state から
    fd.delete('images')
    images.forEach((f) => fd.append('images', f))

    startTransition(async () => {
      const result = await submitMiniInquiry(fd)
      if (result.ok) {
        router.push('/request/mini/thanks')
        return
      }
      setGeneralError(result.error)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      // エラー時は先頭へスクロール
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8" noValidate>
      {/* ハニーポット (人には見えない / bot 対策) */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        defaultValue=""
      />

      {generalError && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {generalError}
        </div>
      )}

      {/* SNS URL */}
      <fieldset className="space-y-3">
        <legend className="font-noto-sans-jp text-base font-semibold text-text-primary">
          SNS の URL <span className="text-primary">*</span>
          <span className="ml-2 text-xs font-normal text-text-secondary">
            （1〜5 件 / 紹介したい投稿のリンク）
          </span>
        </legend>
        {urls.map((url, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="url"
              inputMode="url"
              placeholder="https://www.instagram.com/p/..."
              value={url}
              onChange={(e) => updateUrl(i, e.target.value)}
            />
            {urls.length > 1 && (
              <button
                type="button"
                onClick={() => removeUrl(i)}
                className="shrink-0 rounded-md p-2 text-text-secondary hover:bg-background-dark/5 hover:text-primary"
                aria-label="この URL を削除"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {urls.length < 5 && (
          <button
            type="button"
            onClick={addUrl}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="h-4 w-4" /> URL を追加（残り {5 - urls.length} 件）
          </button>
        )}
        <FieldError message={fieldErrors.sns_urls} />
      </fieldset>

      {/* 種別 */}
      <fieldset className="space-y-3">
        <legend className="font-noto-sans-jp text-base font-semibold text-text-primary">
          種別 <span className="text-primary">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MINI_INQUIRY_TYPES.map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                inquiryType === t
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border-decorative text-text-primary hover:bg-background-dark/5'
              }`}
            >
              <input
                type="radio"
                name="inquiry_type"
                value={t}
                checked={inquiryType === t}
                onChange={() => setInquiryType(t)}
                className="sr-only"
              />
              {MINI_INQUIRY_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.inquiry_type} />
        {inquiryType === 'other' && (
          <div>
            <Input
              type="text"
              name="inquiry_type_other"
              maxLength={100}
              placeholder="どんな内容か簡単にお書きください（100 字以内）"
            />
            <FieldError message={fieldErrors.inquiry_type_other} />
          </div>
        )}
      </fieldset>

      {/* 連絡先 */}
      <fieldset className="space-y-4">
        <legend className="font-noto-sans-jp text-base font-semibold text-text-primary">
          連絡先
        </legend>
        <div>
          <Label htmlFor="phone" className="mb-1.5 block">
            電話番号 <span className="text-primary">*</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="0265-22-2222"
            autoComplete="tel"
          />
          <FieldError message={fieldErrors.phone} />
        </div>
        <div>
          <Label htmlFor="email" className="mb-1.5 block">
            メールアドレス
            <span className="ml-2 text-xs font-normal text-text-secondary">（任意）</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            placeholder="sample@example.com"
            autoComplete="email"
          />
          <FieldError message={fieldErrors.email} />
        </div>
      </fieldset>

      {/* 公開希望時期 */}
      <fieldset className="space-y-3">
        <legend className="font-noto-sans-jp text-base font-semibold text-text-primary">
          公開希望時期 <span className="text-primary">*</span>
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PUBLISH_PREFERENCES.map((p) => (
            <label
              key={p}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                pref === p
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border-decorative text-text-primary hover:bg-background-dark/5'
              }`}
            >
              <input
                type="radio"
                name="publish_preference"
                value={p}
                checked={pref === p}
                onChange={() => setPref(p)}
                className="sr-only"
              />
              {PUBLISH_PREFERENCE_LABELS[p]}
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.publish_preference} />
        {pref === 'by_date' && (
          <div>
            <Label htmlFor="publish_target_date" className="mb-1.5 block">
              公開希望日（この日までに）
            </Label>
            <Input
              id="publish_target_date"
              name="publish_target_date"
              type="date"
              min={minDate}
            />
            <FieldError message={fieldErrors.publish_target_date} />
          </div>
        )}
        {pref === 'in_month' && (
          <div>
            <Label htmlFor="publish_target_month" className="mb-1.5 block">
              公開希望月
            </Label>
            <Input
              id="publish_target_month"
              name="publish_target_month"
              type="month"
              min={minMonth}
            />
            <FieldError message={fieldErrors.publish_target_month} />
          </div>
        )}
      </fieldset>

      {/* 画像 */}
      <fieldset className="space-y-3">
        <legend className="font-noto-sans-jp text-base font-semibold text-text-primary">
          画像
          <span className="ml-2 text-xs font-normal text-text-secondary">
            （任意 / 最大 {INQUIRY_IMAGE_MAX_COUNT} 枚・各 10MB まで）
          </span>
        </legend>
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {previews.map((p, i) => (
              <div
                key={p.url}
                className="relative h-24 w-24 overflow-hidden rounded-lg border border-border-decorative"
              >
                {/* プレビューは object URL のため next/image を使わない */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
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
        {images.length < INQUIRY_IMAGE_MAX_COUNT && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border-decorative px-4 py-3 text-sm text-text-secondary hover:border-primary hover:text-primary">
            <ImagePlus className="h-4 w-4" />
            画像を選ぶ
            <input
              type="file"
              accept={ACCEPT_ATTR}
              multiple
              onChange={onPickImages}
              className="sr-only"
            />
          </label>
        )}
        <FieldError message={fieldErrors.images} />
      </fieldset>

      {/* 同意 */}
      <fieldset className="space-y-2">
        <label className="flex items-start gap-3">
          <span className="mt-0.5">
            <Checkbox
              name="consent"
              checked={consent}
              onCheckedChange={setConsent}
            />
          </span>
          <span className="font-noto-serif-jp text-sm text-text-primary">
            提供した情報を Sayo&apos;s Journal で記事化することに同意します。
            <span className="text-primary">*</span>
          </span>
        </label>
        <FieldError message={fieldErrors.consent} />
      </fieldset>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? '送信中…' : 'この内容で相談する'}
        </Button>
        <p className="mt-3 text-xs text-text-secondary">
          送信後 3 日以内に、ご記入の連絡先へ紗代からお返事します。掲載は無料です。
        </p>
      </div>
    </form>
  )
}
