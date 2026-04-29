'use client'

import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ImageMatchResult } from '@/lib/ig-csv-parser'

interface ValidationSummaryProps {
  rowCount: number
  parseErrors: string[]
  imageMatch: ImageMatchResult | null
  uploadedCount: number
  usernameError: string | null
}

export function ValidationSummary({
  rowCount,
  parseErrors,
  imageMatch,
  uploadedCount,
  usernameError,
}: ValidationSummaryProps) {
  return (
    <div className="space-y-2 rounded-lg border border-border-decorative bg-white p-4">
      <h3 className="text-sm font-medium text-text-primary">📊 検証結果</h3>

      {parseErrors.length > 0 ? (
        <Row icon="error" text={`CSV パースエラー: ${parseErrors.length} 件`}>
          <ul className="mt-1 ml-4 list-disc text-xs text-red-700">
            {parseErrors.slice(0, 5).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {parseErrors.length > 5 && (
              <li className="text-text-secondary">他 {parseErrors.length - 5} 件...</li>
            )}
          </ul>
        </Row>
      ) : (
        <Row icon="ok" text={`CSV 行数: ${rowCount} 件`} />
      )}

      {imageMatch ? (
        <>
          {imageMatch.missing.length > 0 ? (
            <Row
              icon="error"
              text={`画像不足: ${imageMatch.missing.length} 件 / アップロード済み ${uploadedCount} 枚`}
            >
              <ul className="mt-1 ml-4 list-disc text-xs text-red-700">
                {imageMatch.missing.slice(0, 5).map((n) => (
                  <li key={n}>{n}</li>
                ))}
                {imageMatch.missing.length > 5 && (
                  <li className="text-text-secondary">
                    他 {imageMatch.missing.length - 5} 件...
                  </li>
                )}
              </ul>
            </Row>
          ) : (
            <Row
              icon="ok"
              text={`画像ファイル: ${uploadedCount} 枚（必要 ${imageMatch.matchedFiles.length} 枚に過不足なし）`}
            />
          )}
          {imageMatch.extra.length > 0 && (
            <Row
              icon="warn"
              text={`余分な画像: ${imageMatch.extra.length} 枚（取り込み対象外として無視）`}
            />
          )}
        </>
      ) : (
        <Row icon="warn" text="画像ファイルを選択してください" />
      )}

      {usernameError && <Row icon="error" text={usernameError} />}
    </div>
  )
}

interface RowProps {
  icon: 'ok' | 'warn' | 'error'
  text: string
  children?: React.ReactNode
}
function Row({ icon, text, children }: RowProps) {
  const Icon =
    icon === 'ok'
      ? CheckCircle2
      : icon === 'warn'
        ? AlertTriangle
        : AlertCircle
  const color =
    icon === 'ok'
      ? 'text-green-600'
      : icon === 'warn'
        ? 'text-yellow-600'
        : 'text-red-600'
  return (
    <div className="text-sm">
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
        <span className="text-text-primary">{text}</span>
      </div>
      {children}
    </div>
  )
}
