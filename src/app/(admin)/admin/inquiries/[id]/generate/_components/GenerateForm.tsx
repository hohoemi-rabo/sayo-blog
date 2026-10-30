'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, ImagePlus, Sparkles, X } from 'lucide-react'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import {
  INQUIRY_IMAGE_ACCEPT,
  INQUIRY_IMAGE_MAX_BYTES,
} from '@/lib/inquiry-schema'
import type { UrlTextResult } from '@/lib/url-text-extractor'
import { fetchInquiryUrlTexts, uploadAdditionalInquiryImages } from '../../../actions'

const ACCEPT_ATTR = INQUIRY_IMAGE_ACCEPT.join(',')
const ADDITIONAL_IMAGE_MAX_COUNT = 8

interface Props {
  inquiryId: string
  snsUrls: string[]
  /** 依頼者の添付 (チラシ等) があるか。あれば AI が読むので、貼り付け無しでも生成できる */
  hasAttachments: boolean
}

export function GenerateForm({ inquiryId, snsUrls, hasAttachments }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [texts, setTexts] = useState<string[]>(() => snsUrls.map(() => ''))
  const [memo, setMemo] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(snsUrls.length > 0)
  const [urlResults, setUrlResults] = useState<UrlTextResult[] | null>(null)
  const autoFetched = useRef(false)

  // URL の中身を取りに行き、空の貼り付け欄だけ埋める (紗代さんが手で書いた分は上書きしない)
  const fetchUrlTexts = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetchInquiryUrlTexts(inquiryId)
      if (!res.ok) {
        addToast(res.error, 'error')
        return
      }
      setUrlResults(res.results)
      setTexts((prev) =>
        prev.map((t, i) => (t.trim() === '' ? (res.results[i]?.text ?? '') : t))
      )
    } catch (err) {
      console.error(err)
      addToast('URL の内容を取得できませんでした。手で貼り付けてください', 'error')
    } finally {
      setFetching(false)
    }
  }, [inquiryId, addToast])

  useEffect(() => {
    if (snsUrls.length === 0 || autoFetched.current) return
    autoFetched.current = true
    void fetchUrlTexts()
  }, [snsUrls.length, fetchUrlTexts])

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
    if (!hasAttachments && memo.trim() === '' && texts.every((t) => t.trim() === '')) {
      addToast('SNS 投稿の本文か補足メモを入力してください', 'warning')
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
        body: JSON.stringify({ snsTexts, memoText: memo, additionalImageUrls }),
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
      {/* SNS 投稿テキストの貼り付け (チラシだけの依頼は URL が無いので出さない) */}
      {snsUrls.length > 0 && (
        <section className="rounded-xl border border-border-decorative bg-white p-5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-text-primary">URL の内容</h2>
            {!fetching && (
              <button
                type="button"
                onClick={() => void fetchUrlTexts()}
                className="text-xs text-primary hover:underline"
              >
                空の欄をもう一度取得
              </button>
            )}
          </div>
          <p className="mb-4 text-xs text-text-secondary">
            URL の中身を自動で取得して下の欄に入れます。取得できなかった URL だけ、開いて本文を貼り付けてください。
            {hasAttachments && '添付のチラシ・写真は AI が直接読みます。'}
          </p>
          <div className="space-y-4">
            {snsUrls.map((url, i) => (
              <div key={i}>
                <label className="mb-1 block text-xs text-text-secondary">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-all hover:text-primary hover:underline"
                  >
                    URL {i + 1}: {url}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </label>
                <UrlFetchStatus fetching={fetching} result={urlResults?.[i]} />
                <Textarea
                  value={texts[i]}
                  onChange={(e) => updateText(i, e.target.value)}
                  rows={texts[i] ? 8 : 4}
                  placeholder={fetching ? '取得中…' : 'ここに投稿本文を貼り付け'}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 補足メモ */}
      <section className="rounded-xl border border-border-decorative bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-text-primary">補足メモ（任意）</h2>
        <p className="mb-4 text-xs text-text-secondary">
          電話で聞いた日時・会場・参加費など、URL にもチラシにも書かれていないことを書いてください。
          {hasAttachments && snsUrls.length === 0 && '添付のチラシは AI が直接読みます。'}
        </p>
        <Textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={4}
          placeholder="例: 11/15(土) 10:00〜12:00、飯田市公民館、参加費 500 円"
        />
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
          disabled={loading || fetching}
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          {loading ? '生成中…' : fetching ? 'URL を取得中…' : 'AI でたたき台を生成する'}
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

function UrlFetchStatus({
  fetching,
  result,
}: {
  fetching: boolean
  result: UrlTextResult | undefined
}) {
  if (fetching) {
    return <p className="mb-1.5 text-xs text-text-secondary">自動で取得中…</p>
  }
  if (!result) return null
  if (result.status === 'ok') {
    return (
      <p className="mb-1.5 text-xs text-emerald-700">
        ✓ 自動で取得しました。メニューなど関係ない部分が混じっていても、そのままで大丈夫です。
      </p>
    )
  }
  return (
    <p className="mb-1.5 text-xs text-amber-700">
      ⚠ {result.reason}
      {result.status === 'partial'
        ? '。足りない分は URL を開いて貼り足してください。'
        : '。URL を開いて本文を貼り付けてください。'}
    </p>
  )
}
