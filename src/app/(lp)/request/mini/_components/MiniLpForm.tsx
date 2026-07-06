'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, ImagePlus } from 'lucide-react'
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
  return <p className="lp-error">{message}</p>
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

export function MiniLpForm() {
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
        if (
          !INQUIRY_IMAGE_ACCEPT.includes(
            f.type as (typeof INQUIRY_IMAGE_ACCEPT)[number]
          )
        )
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
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="lp-form lp-form-card"
      noValidate
    >
      {/* ハニーポット (人には見えない / bot 対策) */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="honeypot"
        defaultValue=""
      />

      {generalError && <div className="lp-alert">{generalError}</div>}

      {/* 伝えたいこと (本文) */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">
          伝えたいこと
          <span className="opt">（できれば / どんな内容かご自由に）</span>
        </legend>
        <p className="lp-hint">
          告知・イベント・ご近所の話・失敗談など、伝えたいことを自由にお書きください。SNS の URL がある場合は下に貼っていただくだけでも大丈夫です。
        </p>
        <textarea
          name="message"
          className="lp-textarea"
          maxLength={2000}
          placeholder="例）◯月◯日に △△ でマルシェを開きます。地元の作り手が集まって…（2000字まで）"
        />
        <FieldError message={fieldErrors.message} />
      </fieldset>

      {/* SNS URL */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">
          SNS の URL
          <span className="opt">（任意 / 最大 5 件・紹介したい投稿のリンク）</span>
        </legend>
        {urls.map((url, i) => (
          <div key={i} className="lp-urlrow">
            <input
              type="url"
              inputMode="url"
              className="lp-input"
              placeholder="https://www.instagram.com/p/..."
              value={url}
              onChange={(e) => updateUrl(i, e.target.value)}
            />
            {urls.length > 1 && (
              <button
                type="button"
                onClick={() => removeUrl(i)}
                className="lp-iconbtn"
                aria-label="この URL を削除"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {urls.length < 5 && (
          <button type="button" onClick={addUrl} className="lp-addbtn">
            <Plus className="h-4 w-4" /> URL を追加（残り {5 - urls.length} 件）
          </button>
        )}
        <FieldError message={fieldErrors.sns_urls} />
      </fieldset>

      {/* 種別 */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">
          種別<span className="req">*</span>
        </legend>
        <div className="lp-choicegrid cols-4">
          {MINI_INQUIRY_TYPES.map((t) => (
            <label
              key={t}
              className={`lp-choice ${inquiryType === t ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="inquiry_type"
                value={t}
                checked={inquiryType === t}
                onChange={() => setInquiryType(t)}
              />
              {MINI_INQUIRY_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.inquiry_type} />
        {inquiryType === 'other' && (
          <div>
            <input
              type="text"
              name="inquiry_type_other"
              className="lp-input"
              maxLength={100}
              placeholder="どんな内容か簡単にお書きください（100 字以内）"
            />
            <FieldError message={fieldErrors.inquiry_type_other} />
          </div>
        )}
      </fieldset>

      {/* 連絡先 */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">連絡先</legend>
        <div>
          <label htmlFor="lp-phone" className="lp-hint">
            電話番号 <span className="req">*</span>
          </label>
          <input
            id="lp-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className="lp-input"
            placeholder="0265-00-0000"
            autoComplete="tel"
          />
          <FieldError message={fieldErrors.phone} />
        </div>
        <div>
          <label htmlFor="lp-email" className="lp-hint">
            メールアドレス（任意）
          </label>
          <input
            id="lp-email"
            name="email"
            type="email"
            inputMode="email"
            className="lp-input"
            placeholder="sample@example.com"
            autoComplete="email"
          />
          <FieldError message={fieldErrors.email} />
        </div>
      </fieldset>

      {/* 公開希望時期 */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">
          公開希望時期<span className="req">*</span>
        </legend>
        <div className="lp-choicegrid cols-3">
          {PUBLISH_PREFERENCES.map((p) => (
            <label
              key={p}
              className={`lp-choice ${pref === p ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="publish_preference"
                value={p}
                checked={pref === p}
                onChange={() => setPref(p)}
              />
              {PUBLISH_PREFERENCE_LABELS[p]}
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.publish_preference} />
        {pref === 'by_date' && (
          <div>
            <label htmlFor="lp-date" className="lp-hint">
              公開希望日（この日までに）
            </label>
            <input
              id="lp-date"
              name="publish_target_date"
              type="date"
              className="lp-input"
              min={minDate}
            />
            <FieldError message={fieldErrors.publish_target_date} />
          </div>
        )}
        {pref === 'in_month' && (
          <div>
            <label htmlFor="lp-month" className="lp-hint">
              公開希望月
            </label>
            <input
              id="lp-month"
              name="publish_target_month"
              type="month"
              className="lp-input"
              min={minMonth}
            />
            <FieldError message={fieldErrors.publish_target_month} />
          </div>
        )}
      </fieldset>

      {/* 画像 */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">
          画像
          <span className="opt">
            （任意 / 最大 {INQUIRY_IMAGE_MAX_COUNT} 枚・各 10MB まで）
          </span>
        </legend>
        {previews.length > 0 && (
          <div className="lp-thumbs">
            {previews.map((p, i) => (
              <div key={p.url} className="lp-thumb">
                {/* プレビューは object URL のため next/image を使わない */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.name} />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label="画像を削除"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {images.length < INQUIRY_IMAGE_MAX_COUNT && (
          <label className="lp-imgpick">
            <ImagePlus className="h-4 w-4" />
            画像を選ぶ
            <input
              type="file"
              accept={ACCEPT_ATTR}
              multiple
              onChange={onPickImages}
              className="honeypot"
            />
          </label>
        )}
        <FieldError message={fieldErrors.images} />
      </fieldset>

      {/* 同意 */}
      <fieldset className="lp-fieldset">
        <label className="lp-consent">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            提供した情報を Sayo&apos;s Journal で記事化することに同意します。
            <span className="req">*</span>
          </span>
        </label>
        <FieldError message={fieldErrors.consent} />
      </fieldset>

      <div>
        <button type="submit" className="lp-submit" disabled={isPending}>
          {isPending ? '送信中…' : 'この内容で相談する'}
        </button>
        <p className="lp-submit-note">
          送信後 3 日以内に、ご記入の連絡先へお返事します。掲載は無料です。
        </p>
      </div>
    </form>
  )
}
