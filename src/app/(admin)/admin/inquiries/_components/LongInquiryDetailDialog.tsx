'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import type { LongInquiry, LongInquiryStatus } from '@/lib/types'
import {
  CLIENT_TYPE_LABELS,
  LONG_INQUIRY_STATUS_LABELS,
  LONG_PLAN_LABELS,
  formatClientName,
} from '@/lib/inquiries'
import {
  updateLongInquiryStatus,
  updateLongInquiryNotes,
  deleteLongInquiry,
  linkInquiryToPost,
  unlinkInquiryFromPost,
  type LinkablePost,
} from '../actions'

interface Props {
  inquiry: LongInquiry | null
  open: boolean
  onClose: () => void
  linkablePosts: LinkablePost[]
}

const STATUS_ORDER: LongInquiryStatus[] = [
  'pending',
  'contacted',
  'scheduled',
  'interviewed',
  'writing',
  'published',
  'cancelled',
]

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-1.5">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm text-text-primary">{children}</dd>
    </div>
  )
}

/** datetime-local 入力用 (timezone なし) に ISO 文字列を整形 */
function toDatetimeLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function LongInquiryDetailDialog({
  inquiry,
  open,
  onClose,
  linkablePosts,
}: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [isPending, startTransition] = useTransition()

  // 案件管理フォーム state
  const [status, setStatus] = useState<LongInquiryStatus>('pending')
  const [scheduledAt, setScheduledAt] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [linkedPostId, setLinkedPostId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (!inquiry) return
    setStatus(inquiry.status)
    setScheduledAt(toDatetimeLocalInput(inquiry.scheduled_at))
    setFeeAmount(inquiry.fee_amount != null ? String(inquiry.fee_amount) : '')
    setLinkedPostId(inquiry.generated_post_id ?? '')
    setNotes(inquiry.admin_notes ?? '')
    setConfirmingDelete(false)
  }, [inquiry])

  if (!inquiry) return null

  function saveCase() {
    const id = inquiry!.id
    const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : null
    const fee = feeAmount.trim() === '' ? null : Number(feeAmount)
    if (fee !== null && (!Number.isFinite(fee) || fee < 0)) {
      addToast('金額は 0 以上の数字で入力してください', 'warning')
      return
    }
    startTransition(async () => {
      const res = await updateLongInquiryStatus(id, status, {
        scheduledAt: scheduledIso,
        feeAmount: fee,
      })
      if (res.ok) {
        addToast('案件情報を更新しました', 'success')
        router.refresh()
      } else {
        addToast(res.error, 'error')
      }
    })
  }

  function saveNotes() {
    const id = inquiry!.id
    startTransition(async () => {
      const res = await updateLongInquiryNotes(id, notes)
      if (res.ok) {
        addToast('メモを保存しました', 'success')
        router.refresh()
      } else {
        addToast(res.error, 'error')
      }
    })
  }

  function handleLink() {
    const id = inquiry!.id
    if (!linkedPostId) {
      // 解除
      startTransition(async () => {
        const res = await unlinkInquiryFromPost(id)
        if (res.ok) {
          addToast('紐付けを解除しました', 'success')
          router.refresh()
        } else {
          addToast(res.error, 'error')
        }
      })
      return
    }
    startTransition(async () => {
      const res = await linkInquiryToPost(id, linkedPostId)
      if (res.ok) {
        addToast('記事を紐付けました', 'success')
        router.refresh()
      } else {
        addToast(res.error, 'error')
      }
    })
  }

  function handleDelete() {
    const id = inquiry!.id
    startTransition(async () => {
      const res = await deleteLongInquiry(id)
      if (res.ok) {
        addToast('依頼を削除しました', 'success')
        router.refresh()
        onClose()
      } else {
        addToast(res.error, 'error')
      }
    })
  }

  function goNewPost() {
    router.push(`/admin/posts/new?from_inquiry=long&id=${inquiry!.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col p-0">
        <DialogHeader className="border-b border-border-decorative px-6 py-4">
          <DialogTitle>取材依頼 #{inquiry.id.slice(0, 8)}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {/* 依頼情報 */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">依頼情報</h3>
            <dl className="divide-y divide-border-decorative/50">
              <Row label="受付">
                {new Date(inquiry.created_at).toLocaleString('ja-JP')}
              </Row>
              <Row label="種別">{CLIENT_TYPE_LABELS[inquiry.client_type]}</Row>
              <Row label="希望プラン">
                {LONG_PLAN_LABELS[inquiry.desired_plan]}
              </Row>
              <Row label="依頼者">{formatClientName(inquiry)}</Row>
              <Row label="担当者">{inquiry.contact_person}</Row>
              <Row label="住所">{inquiry.address}</Row>
              <Row label="連絡先">
                <div>{inquiry.phone}</div>
                {inquiry.email && (
                  <div className="text-text-secondary">{inquiry.email}</div>
                )}
              </Row>
              <Row label="取材希望">
                {inquiry.interview_preference || (
                  <span className="text-text-secondary">未記入</span>
                )}
              </Row>
              <Row label="公開希望">
                {inquiry.publish_preference || (
                  <span className="text-text-secondary">未記入</span>
                )}
              </Row>
              <Row label="取材内容">{inquiry.interview_content}</Row>
            </dl>
          </section>

          {/* 案件管理 */}
          <section className="rounded-lg border border-border-decorative bg-background/40 p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">案件管理</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-text-secondary">
                  ステータス
                </label>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LongInquiryStatus)}
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {LONG_INQUIRY_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-secondary">
                  取材日時
                </label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-secondary">
                  金額 (円)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  placeholder="例: 500"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={saveCase}
                  disabled={isPending}
                  className="w-full"
                >
                  ステータス / 取材日 / 金額を更新
                </Button>
              </div>
            </div>

            {/* 記事紐付け */}
            <div className="mt-4 border-t border-border-decorative/60 pt-3">
              <label className="mb-1.5 block text-xs text-text-secondary">
                紐付け記事
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[200px]">
                  <Select
                    value={linkedPostId}
                    onChange={(e) => setLinkedPostId(e.target.value)}
                  >
                    <option value="">（紐付けなし）</option>
                    {/* 既に紐付いている post も選択肢に残す */}
                    {inquiry.generated_post_id &&
                      !linkablePosts.some((p) => p.id === inquiry.generated_post_id) && (
                        <option value={inquiry.generated_post_id}>
                          (現在の紐付け先) {inquiry.generated_post_id.slice(0, 8)}
                        </option>
                      )}
                    {linkablePosts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.is_published ? '🟢' : '⚪️'} {p.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLink}
                  disabled={isPending}
                >
                  紐付け更新
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={goNewPost}
                  disabled={isPending}
                >
                  ＋ 新規記事を作成
                </Button>
              </div>
              {inquiry.generated_post_id && (
                <p className="mt-2 text-xs">
                  <Link
                    href={`/admin/posts/${inquiry.generated_post_id}`}
                    className="text-primary hover:underline"
                  >
                    紐付け先の記事編集を開く →
                  </Link>
                </p>
              )}
            </div>
          </section>

          {/* 内部メモ */}
          <section>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              内部メモ
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="やり取りメモ、見積もり経緯、当日連絡先など"
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
          </section>
        </div>

        <DialogFooter className="flex-wrap items-center gap-2 border-t border-border-decorative px-6 py-4">
          {confirmingDelete ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-red-600">
                この依頼を削除しますか？（元に戻せません）
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
