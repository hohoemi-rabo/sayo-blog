'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileText, Image as ImageIcon, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import {
  matchImageFiles,
  parseIgCsv,
  validateUsernameMatch,
  type CsvParseResult,
  type ImageMatchResult,
} from '@/lib/ig-csv-parser'
import type { IgSource } from '@/lib/types'
import { uploadIgImports } from '../actions'
import { CsvPreview } from './CsvPreview'
import { ValidationSummary } from './ValidationSummary'

interface UploadClientProps {
  sources: IgSource[]
}

export function UploadClient({ sources }: UploadClientProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [csvDragActive, setCsvDragActive] = useState(false)
  const [imgDragActive, setImgDragActive] = useState(false)

  const selectedSource = sources.find((s) => s.id === sourceId) ?? null

  const csvResult: CsvParseResult | null = useMemo(() => {
    if (!csvText) return null
    return parseIgCsv(csvText)
  }, [csvText])

  const usernameError: string | null = useMemo(() => {
    if (!csvResult || csvResult.rows.length === 0) return null
    if (!selectedSource) return null
    return validateUsernameMatch(csvResult.rows, selectedSource.ig_username)
  }, [csvResult, selectedSource])

  const imageMatch: ImageMatchResult | null = useMemo(() => {
    if (!csvResult || csvResult.rows.length === 0) return null
    if (imageFiles.length === 0) return null
    return matchImageFiles(
      csvResult.rows,
      imageFiles.map((f) => f.name)
    )
  }, [csvResult, imageFiles])

  const canSubmit =
    !isPending &&
    Boolean(sourceId) &&
    Boolean(csvText) &&
    Boolean(csvResult && csvResult.errors.length === 0 && csvResult.rows.length > 0) &&
    Boolean(imageMatch && imageMatch.missing.length === 0) &&
    !usernameError

  const handleCsvFile = async (file: File) => {
    setCsvFile(file)
    const text = await file.text()
    setCsvText(text)
  }

  const handleCsvDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setCsvDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleCsvFile(file)
  }

  const handleImageFiles = (files: FileList | File[]) => {
    const list = Array.from(files)
    // 同名ファイルは新しいものを優先（ユーザーが再選択したら上書き）
    setImageFiles((prev) => {
      const map = new Map<string, File>()
      for (const f of prev) map.set(f.name, f)
      for (const f of list) map.set(f.name, f)
      return Array.from(map.values())
    })
  }

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setImgDragActive(false)
    if (e.dataTransfer.files) handleImageFiles(e.dataTransfer.files)
  }

  const removeImage = (name: string) => {
    setImageFiles((prev) => prev.filter((f) => f.name !== name))
  }

  const reset = () => {
    setCsvFile(null)
    setCsvText('')
    setImageFiles([])
  }

  const handleSubmit = () => {
    if (!canSubmit || !csvText || imageFiles.length === 0) return
    const fd = new FormData()
    fd.set('source_id', sourceId)
    fd.set('csv', csvText)
    for (const f of imageFiles) fd.append('images', f)

    startTransition(async () => {
      const result = await uploadIgImports(fd)
      if (!result.success) {
        addToast(result.error, 'error', 6000)
        return
      }
      const { total, inserted, skipped, failedImages, warnings } = result.data
      const message = `取り込み完了: ${inserted} 件追加 / ${skipped} 件重複スキップ${failedImages > 0 ? ` / 画像エラー ${failedImages} 件` : ''} (CSV ${total} 行)`
      addToast(message, 'success', 6000)
      for (const w of warnings.slice(0, 5)) {
        addToast(w, 'warning', 5000)
      }
      reset()
      router.push('/admin/instagram/imports')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Source */}
      <Card title="1. 取得元アカウントを選択">
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="h-10 w-full rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
        >
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              @{s.ig_username}（{s.display_name}）
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-text-secondary">
          許可状態が「許可済み」かつ取得設定が「有効」のアカウントのみ表示されます。
        </p>
      </Card>

      {/* Step 2: CSV */}
      <Card title="2. CSV ファイルをドロップ">
        <div
          className={cn(
            'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            csvDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border-decorative hover:border-primary/50'
          )}
          onDragEnter={(e) => {
            e.preventDefault()
            setCsvDragActive(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setCsvDragActive(true)
          }}
          onDragLeave={() => setCsvDragActive(false)}
          onDrop={handleCsvDrop}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            id="csv-file-input"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleCsvFile(f)
            }}
          />
          <label
            htmlFor="csv-file-input"
            className="flex cursor-pointer flex-col items-center gap-2"
          >
            {csvFile ? (
              <>
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">{csvFile.name}</span>
                <span className="text-xs text-text-secondary">
                  {(csvFile.size / 1024).toFixed(1)} KB
                </span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-text-secondary" />
                <span className="text-sm">クリックまたは CSV をドロップ</span>
                <span className="text-xs text-text-secondary">UTF-8、ヘッダー行必須</span>
              </>
            )}
          </label>
        </div>
        <a
          href="/admin/instagram/imports/sample.csv"
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Download className="h-3.5 w-3.5" />
          サンプル CSV をダウンロード
        </a>
        {csvResult && <CsvPreview rows={csvResult.rows} />}
      </Card>

      {/* Step 3: Images */}
      <Card title="3. 画像ファイルをドロップ（複数 OK）">
        <div
          className={cn(
            'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            imgDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border-decorative hover:border-primary/50'
          )}
          onDragEnter={(e) => {
            e.preventDefault()
            setImgDragActive(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setImgDragActive(true)
          }}
          onDragLeave={() => setImgDragActive(false)}
          onDrop={handleImageDrop}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            id="image-file-input"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) handleImageFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <label
            htmlFor="image-file-input"
            className="flex cursor-pointer flex-col items-center gap-2"
          >
            <ImageIcon className="h-8 w-8 text-text-secondary" />
            <span className="text-sm">
              {imageFiles.length === 0
                ? 'クリックまたは画像をドロップ'
                : `${imageFiles.length} 枚選択中（追加できます）`}
            </span>
            <span className="text-xs text-text-secondary">
              jpg / png / webp、各 10MB 以内
            </span>
          </label>
        </div>
        {imageFiles.length > 0 && (
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border-decorative bg-white p-2 text-xs">
            {imageFiles.map((f) => (
              <li
                key={f.name}
                className="flex items-center justify-between gap-2 px-2 py-1"
              >
                <span className="truncate font-mono">{f.name}</span>
                <span className="shrink-0 text-text-secondary">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(f.name)}
                  className="shrink-0 rounded p-1 text-text-secondary hover:bg-background-dark/5"
                  aria-label="削除"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Step 4: Summary */}
      {csvResult && (
        <ValidationSummary
          rowCount={csvResult.rows.length}
          parseErrors={csvResult.errors}
          imageMatch={imageMatch}
          uploadedCount={imageFiles.length}
          usernameError={usernameError}
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={reset} disabled={isPending}>
          リセット
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {isPending ? '取り込み中...' : '取り込み実行'}
        </Button>
      </div>
    </div>
  )
}

interface CardProps {
  title: string
  children: React.ReactNode
}
function Card({ title, children }: CardProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border-decorative bg-white p-4">
      <h2 className="text-sm font-medium text-text-primary">{title}</h2>
      {children}
    </section>
  )
}
