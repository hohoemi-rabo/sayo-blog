'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ImagePlus, Sparkles, X } from 'lucide-react'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import {
  CRAFT_ACCEPT_ATTR,
  CRAFT_MAX_BYTES,
  CRAFT_MAX_FILES,
  isCraftAcceptMime,
} from '@/lib/craft-inputs'

interface Props {
  mode: 'flyer' | 'memo'
}

export function CraftForm({ mode }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    setFiles((prev) => {
      const merged = [...prev]
      for (const f of picked) {
        if (merged.length >= CRAFT_MAX_FILES) {
          addToast(`チラシは最大 ${CRAFT_MAX_FILES} 枚までです`, 'warning')
          break
        }
        if (!isCraftAcceptMime(f.type)) {
          addToast(`${f.name} は対応していない形式です（JPEG / PNG / WebP / PDF）`, 'warning')
          continue
        }
        if (f.size > CRAFT_MAX_BYTES) {
          addToast(`${f.name} は 10MB を超えています`, 'warning')
          continue
        }
        merged.push(f)
      }
      return merged
    })
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleGenerate() {
    if (files.length === 0 && memo.trim() === '') {
      addToast('チラシ画像かメモのどちらかを入力してください', 'warning')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      files.forEach((f) => fd.append('flyers', f))
      fd.append('memo', memo)

      const res = await fetch('/api/admin/posts/craft', {
        method: 'POST',
        body: fd,
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

  const flyerSection = (
    <section
      key="flyer"
      className="rounded-xl border border-border-decorative bg-white p-5"
    >
      <h2 className="mb-1 text-sm font-semibold text-text-primary">
        チラシ画像 / PDF{mode === 'memo' ? '（任意）' : ''}
      </h2>
      <p className="mb-4 text-xs text-text-secondary">
        チラシの写真や PDF をアップロードしてください（最大 {CRAFT_MAX_FILES} 枚 / 1 枚 10MB まで）。
        画像は AI が内容を読み取るためのもので、記事にはそのまま載りません。
      </p>

      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3">
          {files.map((f, i) => {
            const isImage = f.type.startsWith('image/')
            return (
              <div
                key={`${f.name}-${i}`}
                className="relative h-24 w-24 overflow-hidden rounded-lg border border-border-decorative bg-gray-50"
              >
                {isImage ? (
                  // プレビューは object URL のため next/image を使わない
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(f)}
                    alt={f.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-center">
                    <FileText className="h-6 w-6 text-text-secondary" />
                    <span className="line-clamp-2 break-all text-[10px] text-text-secondary">
                      {f.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  aria-label="削除"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {files.length < CRAFT_MAX_FILES && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border-decorative px-4 py-3 text-sm text-text-secondary hover:border-primary hover:text-primary">
          <ImagePlus className="h-4 w-4" />
          チラシを追加
          <input
            type="file"
            accept={CRAFT_ACCEPT_ATTR}
            multiple
            onChange={onPickFiles}
            className="sr-only"
          />
        </label>
      )}
    </section>
  )

  const memoSection = (
    <section
      key="memo"
      className="rounded-xl border border-border-decorative bg-white p-5"
    >
      <h2 className="mb-1 text-sm font-semibold text-text-primary">
        メモ・補足{mode === 'flyer' ? '（任意）' : ''}
      </h2>
      <p className="mb-4 text-xs text-text-secondary">
        {mode === 'memo'
          ? '取材メモや箇条書きを貼り付けてください。ここに書かれた事実をもとに記事を組み立てます。'
          : 'チラシに載っていない補足や、記事で触れてほしいことがあれば書いてください。'}
      </p>
      <Textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        rows={mode === 'memo' ? 10 : 5}
        placeholder={
          mode === 'memo'
            ? '例）〇〇カフェ。3/20 オープン。飯田市本町。自家焙煎コーヒーが自慢。店主は東京で修行…'
            : '例）駐車場は近くの市営駐車場が便利。取材でこんな話が印象的だった…'
        }
      />
    </section>
  )

  const sections =
    mode === 'memo' ? [memoSection, flyerSection] : [flyerSection, memoSection]

  return (
    <div className="space-y-6">
      {sections}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleGenerate}
          disabled={loading}
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          {loading ? '生成中…（30秒ほどかかります）' : 'AI で下書きを作る'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/posts/create')}
          disabled={loading}
        >
          キャンセル
        </Button>
      </div>
    </div>
  )
}
