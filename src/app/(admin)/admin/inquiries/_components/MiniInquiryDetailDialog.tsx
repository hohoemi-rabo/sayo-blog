'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Sparkles, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { InquiryAttachments } from '@/components/admin/InquiryAttachments'
import { ARTICLE_ANGLE_LABELS } from '@/lib/article-angles'
import type { MiniInquiry, MiniInquiryStatus } from '@/lib/types'
import {
  MINI_INQUIRY_TYPE_LABELS,
  MINI_INQUIRY_STATUS_LABELS,
  formatMiniPublishPreference,
} from '@/lib/inquiries'
import {
  updateMiniInquiryStatus,
  updateMiniInquiryNotes,
  deleteMiniInquiry,
} from '../actions'

interface Props {
  inquiry: MiniInquiry | null
  open: boolean
  onClose: () => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2 py-2">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="text-sm text-text-primary">{children}</dd>
    </div>
  )
}

export function MiniInquiryDetailDialog({ inquiry, open, onClose }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    setNotes(inquiry?.admin_notes ?? '')
    setConfirmingDelete(false)
  }, [inquiry])

  if (!inquiry) return null

  function changeStatus(status: MiniInquiryStatus) {
    const id = inquiry!.id
    startTransition(async () => {
      const res = await updateMiniInquiryStatus(id, status)
      if (res.ok) {
        addToast('ステータスを更新しました', 'success')
        router.refresh()
        onClose()
      } else {
        addToast(res.error, 'error')
      }
    })
  }

  function saveNotes() {
    const id = inquiry!.id
    startTransition(async () => {
      const res = await updateMiniInquiryNotes(id, notes)
      if (res.ok) {
        addToast('メモを保存しました', 'success')
        router.refresh()
      } else {
        addToast(res.error, 'error')
      }
    })
  }

  function handleDelete() {
    const id = inquiry!.id
    startTransition(async () => {
      const res = await deleteMiniInquiry(id)
      if (res.ok) {
        addToast('依頼を削除しました', 'success')
        router.refresh()
        onClose()
      } else {
        addToast(res.error, 'error')
      }
    })
  }

  const goGenerate = () => router.push(`/admin/inquiries/${inquiry.id}/generate`)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-2xl flex-col p-0">
        <DialogHeader className="border-b border-border-decorative px-6 py-4">
          <DialogTitle>ミニ記事の依頼</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <dl className="divide-y divide-border-decorative/50">
            <Row label="受付">
              {new Date(inquiry.created_at).toLocaleString('ja-JP')}
            </Row>
            <Row label="ステータス">
              <span className="inline-flex items-center rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-text-primary">
                {MINI_INQUIRY_STATUS_LABELS[inquiry.status]}
              </span>
            </Row>
            <Row label="種別">
              {MINI_INQUIRY_TYPE_LABELS[inquiry.inquiry_type]}
              {inquiry.inquiry_type === 'other' && inquiry.inquiry_type_other
                ? `（${inquiry.inquiry_type_other}）`
                : null}
            </Row>
            <Row label="SNS URL">
              {inquiry.sns_urls.length === 0 ? (
                <span className="text-text-secondary">なし</span>
              ) : (
                <ul className="space-y-1">
                  {inquiry.sns_urls.map((url, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                      >
                        {url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Row>
            <Row label="切り口">
              {inquiry.article_angle ? (
                ARTICLE_ANGLE_LABELS[inquiry.article_angle]
              ) : (
                <span className="text-text-secondary">診断なし</span>
              )}
            </Row>
            <Row label="チラシ・写真">
              <InquiryAttachments urls={inquiry.image_urls} />
            </Row>
            <Row label="連絡先">
              <div>{inquiry.phone}</div>
              {inquiry.email && (
                <div className="text-text-secondary">{inquiry.email}</div>
              )}
            </Row>
            <Row label="公開希望">
              {formatMiniPublishPreference(inquiry)}
            </Row>
            {inquiry.generated_post_id && (
              <Row label="生成記事">
                <Link
                  href={`/admin/posts/${inquiry.generated_post_id}`}
                  className="text-primary hover:underline"
                >
                  記事編集を開く
                </Link>
              </Row>
            )}
          </dl>

          {/* 内部メモ */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              内部メモ
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="対応状況やスキップ理由など"
              rows={3}
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={saveNotes}
                disabled={isPending}
              >
                メモを保存
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-wrap items-center gap-2 border-t border-border-decorative px-6 py-4">
          {confirmingDelete ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-red-600">
                この依頼を削除しますか？（添付画像も削除され、元に戻せません）
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isPending}
                >
                  やめる
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="bg-red-500 hover:bg-red-600"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? '削除中…' : '削除する'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-red-500 hover:bg-red-50"
                onClick={() => setConfirmingDelete(true)}
                disabled={isPending}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                削除
              </Button>
              {(inquiry.status === 'pending' || inquiry.status === 'generating') && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={goGenerate}
                  disabled={isPending}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  {inquiry.status === 'generating' ? '記事化を続ける' : '記事化する'}
                </Button>
              )}
              {inquiry.status === 'pending' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => changeStatus('skipped')}
                  disabled={isPending}
                >
                  スキップ
                </Button>
              )}
              {(inquiry.status === 'skipped' || inquiry.status === 'generating') && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => changeStatus('pending')}
                  disabled={isPending}
                >
                  未対応に戻す
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isPending}
              >
                閉じる
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
