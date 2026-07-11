'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, X, Link2, FileUp, FileText, Lightbulb, Compass } from 'lucide-react'
import {
  MINI_INQUIRY_TYPE_LABELS,
  PUBLISH_PREFERENCE_LABELS,
} from '@/lib/inquiries'
import { findArticleAngle } from '@/lib/article-angles'
import {
  INQUIRY_ATTACHMENT_ACCEPT,
  INQUIRY_IMAGE_MAX_BYTES,
  INQUIRY_IMAGE_MAX_COUNT,
  MINI_INQUIRY_TYPES,
  PUBLISH_PREFERENCES,
} from '@/lib/inquiry-schema'
import type { MiniInquiryType, PublishPreference } from '@/lib/types'
import { submitMiniInquiry } from '../actions'

const ACCEPT_ATTR = INQUIRY_ATTACHMENT_ACCEPT.join(',')
const MAX_URLS = 5

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
  // 切り口診断 (/request/post/guide) から ?angle=... で流入したときだけ効く
  const angle = findArticleAngle(useSearchParams().get('angle'))
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const [urls, setUrls] = useState<string[]>([''])
  const [inquiryType, setInquiryType] = useState<MiniInquiryType | ''>('')
  const [pref, setPref] = useState<PublishPreference | ''>('')
  const [files, setFiles] = useState<File[]>([])
  const [consent, setConsent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  // PDF は <img> で表示できないので種類で振り分ける
  const previews = useMemo(
    () =>
      files.map((f) => ({
        name: f.name,
        isPdf: f.type === 'application/pdf',
        url: f.type === 'application/pdf' ? null : URL.createObjectURL(f),
      })),
    [files]
  )
  useEffect(() => {
    return () => {
      previews.forEach((p) => p.url && URL.revokeObjectURL(p.url))
    }
  }, [previews])

  const minDate = todayPlus(1)
  const minMonth = currentMonth()

  function updateUrl(index: number, value: string) {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)))
  }
  function addUrl() {
    setUrls((prev) => (prev.length < MAX_URLS ? [...prev, ''] : prev))
  }
  function removeUrl(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index))
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = '' // 同じファイルを選び直せるように
    setFiles((prev) => {
      const merged = [...prev]
      for (const f of picked) {
        if (merged.length >= INQUIRY_IMAGE_MAX_COUNT) break
        if (f.size > INQUIRY_IMAGE_MAX_BYTES) continue
        if (!INQUIRY_ATTACHMENT_ACCEPT.includes(f.type as never)) continue
        merged.push(f)
      }
      return merged
    })
  }
  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
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
    // 添付も state から
    fd.delete('images')
    files.forEach((f) => fd.append('images', f))

    startTransition(async () => {
      const result = await submitMiniInquiry(fd)
      if (result.ok) {
        router.push('/request/post/thanks')
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

      {/* 診断から来た人だけ: 選んだ切り口を控え、送るべき投稿を思い出せるようにする */}
      {angle && (
        <>
          <input type="hidden" name="article_angle" value={angle.key} />
          <div className="lp-angle">
            <div className="lp-angle-head">
              <Compass className="h-4 w-4" />
              <b>診断結果: {angle.title}</b>
              <Link href="/request/post/guide" className="lp-angle-redo">
                やり直す
              </Link>
            </div>
            <p>{angle.impression}</p>
            <ol className="lp-angle-picks">
              {angle.picks.map((pick) => (
                <li key={pick}>{pick}</li>
              ))}
            </ol>
            <p className="lp-angle-note">
              この 5
              つに当てはまる投稿を選んで、下の欄に貼ってください。ぴったりそろわなくても大丈夫です。
            </p>
          </div>
        </>
      )}

      {/* ① 送るもの — SNS の URL か チラシ、どちらか一方でOK */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">
          送るもの<span className="req">*</span>
          <span className="opt">（どちらか一方で大丈夫です）</span>
        </legend>
        <p className="lp-hint">
          SNS に投稿しているなら
          <b>投稿の URL</b>を、チラシで宣伝しているなら
          <b>チラシ</b>を送ってください。もちろん両方あっても大丈夫です。
        </p>

        <div className="lp-sendbox">
          <div className="lp-sendbox-head">
            <Link2 className="h-4 w-4" />
            <b>SNS 投稿の URL</b>
            <span>最大 {MAX_URLS} 件 → 1 本の記事に</span>
          </div>
          <p className="lp-hint">
            Instagram・X・Facebook など、どの SNS でも大丈夫です。
            <b>
              1 回の送信で書けるのは、1 つの話題についての記事です。
            </b>
            同じお店・同じ活動・同じイベントについての投稿を、まとめて送ってください。
          </p>

          <details className="lp-example">
            <summary>
              <Lightbulb className="h-4 w-4" />
              たとえば、飲食店の紹介記事にするなら
            </summary>
            <div className="lp-example-body">
              <p>
                バラバラの日に投稿した 5 つを、1 本の紹介記事にまとめます。
              </p>
              <ol className="lp-example-list">
                <li>
                  <span>投稿 1</span>お店の特徴（どんな料理・どんな雰囲気）
                </li>
                <li>
                  <span>投稿 2</span>営業日・営業時間のお知らせ
                </li>
                <li>
                  <span>投稿 3</span>昼と夜の使い方（ひとりランチ・宴会など）
                </li>
                <li>
                  <span>投稿 4</span>店主の人柄・始めたきっかけ
                </li>
                <li>
                  <span>投稿 5</span>住所・駐車場などの基本情報
                </li>
              </ol>
              <p className="lp-example-warn">
                逆に、「お店の紹介」と「別のイベント告知」のように話題が違うものは、
                1 本の記事にまとまりません。お手数ですが、話題ごとに分けて送ってください。
              </p>
            </div>
          </details>

          {urls.map((url, i) => (
            <div key={i} className="lp-urlrow">
              <span className="lp-urlnum" aria-hidden="true">
                {i + 1}
              </span>
              <input
                type="url"
                inputMode="url"
                className="lp-input"
                placeholder="https://www.instagram.com/p/..."
                aria-label={`投稿 ${i + 1} の URL`}
                value={url}
                onChange={(e) => updateUrl(i, e.target.value)}
              />
              {urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeUrl(i)}
                  className="lp-iconbtn"
                  aria-label={`投稿 ${i + 1} の URL を削除`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {urls.length < MAX_URLS && (
            <button type="button" onClick={addUrl} className="lp-addbtn">
              <Plus className="h-4 w-4" /> 同じ話題の投稿を追加（あと{' '}
              {MAX_URLS - urls.length} 件）
            </button>
          )}
          <FieldError message={fieldErrors.sns_urls} />
        </div>

        <div className="lp-or">
          <span>または</span>
        </div>

        <div className="lp-sendbox">
          <div className="lp-sendbox-head">
            <FileUp className="h-4 w-4" />
            <b>チラシ・写真</b>
            <span>
              最大 {INQUIRY_IMAGE_MAX_COUNT} 点 / 画像・PDF / 各 10MB まで
            </span>
          </div>
          <p className="lp-hint">
            チラシは写真に撮ったものでも、PDF でも大丈夫です。SNS
            に投稿していない方は、こちらだけで送れます。
          </p>
          {previews.length > 0 && (
            <div className="lp-thumbs">
              {previews.map((p, i) =>
                p.isPdf ? (
                  <div key={p.name + i} className="lp-thumb lp-thumb-file">
                    <FileText className="h-6 w-6" />
                    <span>{p.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      aria-label="この添付を削除"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div key={p.url ?? p.name} className="lp-thumb">
                    {/* プレビューは object URL のため next/image を使わない */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url!} alt={p.name} />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      aria-label="この添付を削除"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
          {files.length < INQUIRY_IMAGE_MAX_COUNT && (
            <label className="lp-imgpick">
              <FileUp className="h-4 w-4" />
              チラシ・写真を選ぶ
              <input
                type="file"
                accept={ACCEPT_ATTR}
                multiple
                onChange={onPickFiles}
                className="honeypot"
              />
            </label>
          )}
          <FieldError message={fieldErrors.images} />
        </div>

        <FieldError message={fieldErrors.attachments} />
      </fieldset>

      {/* ② 種別 */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">
          種別<span className="req">*</span>
        </legend>
        <p className="lp-hint">
          ご近所の話・雑談など、当てはまる種別が無ければ「その他」を選んでご自由にお書きください。
        </p>
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
            <textarea
              name="inquiry_type_other"
              className="lp-textarea"
              maxLength={200}
              rows={3}
              placeholder="例）ご近所で見つけた小さな出来事、雑談など（200 字以内）"
            />
            <FieldError message={fieldErrors.inquiry_type_other} />
          </div>
        )}
      </fieldset>

      {/* ③ 公開希望時期 */}
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

      {/* ④ 連絡先 */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">連絡先</legend>
        <div className="lp-field2">
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
        </div>
      </fieldset>

      {/* ⑤ 同意 */}
      <fieldset className="lp-fieldset">
        <p className="lp-usage">
          送っていただいた SNS
          投稿の文章・写真や、チラシの内容は、記事にする際に使わせていただく場合があります。掲載前に内容をご確認いただき、写真の使用可否もそのときに伺います。
        </p>
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
          {isPending ? '送信中…' : '無料で記事掲載を依頼する'}
        </button>
        <p className="lp-submit-note">
          掲載は無料です。費用は一切かかりません。送信後 3
          日以内に、ご記入の連絡先へお返事します。
        </p>
      </div>
    </form>
  )
}
