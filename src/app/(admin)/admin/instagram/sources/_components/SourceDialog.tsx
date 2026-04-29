'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import type { IgPermissionStatus, IgSource } from '@/lib/types'
import {
  createIgSource,
  updateIgSource,
  type CategoryOption,
  type IgSourceInput,
} from '../actions'

export type SourceDialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; source: IgSource }

interface SourceDialogProps {
  state: SourceDialogState
  categories: CategoryOption[]
  permissionLabels: Record<IgPermissionStatus, string>
  onClose: () => void
  onSaved: (message: string) => void
  onError: (message: string) => void
}

interface FormState {
  ig_username: string
  display_name: string
  category_slug: string
  permission_status: IgPermissionStatus
  permission_date: string
  permission_memo: string
  contact_info: string
  is_active: boolean
}

const INITIAL_FORM: FormState = {
  ig_username: '',
  display_name: '',
  category_slug: '',
  permission_status: 'not_requested',
  permission_date: '',
  permission_memo: '',
  contact_info: '',
  is_active: false,
}

const PERMISSION_VALUES: IgPermissionStatus[] = [
  'not_requested',
  'requested',
  'approved',
  'denied',
]

export function SourceDialog({
  state,
  categories,
  permissionLabels,
  onClose,
  onSaved,
  onError,
}: SourceDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [isPending, startTransition] = useTransition()

  const open = state.mode !== 'closed'
  const isEdit = state.mode === 'edit'

  useEffect(() => {
    if (state.mode === 'edit') {
      const s = state.source
      setForm({
        ig_username: s.ig_username,
        display_name: s.display_name,
        category_slug: s.category_slug ?? '',
        permission_status: s.permission_status,
        permission_date: s.permission_date ?? '',
        permission_memo: s.permission_memo ?? '',
        contact_info: s.contact_info ?? '',
        is_active: s.is_active,
      })
    } else if (state.mode === 'create') {
      setForm(INITIAL_FORM)
    }
  }, [state])

  const isApproved = form.permission_status === 'approved'

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // permission_status を approved 以外に変更したら is_active を強制で false に
      if (key === 'permission_status' && value !== 'approved') {
        next.is_active = false
      }
      return next
    })
  }

  const handleUsernameChange = (raw: string) => {
    update('ig_username', raw.replace(/^@+/, ''))
  }

  const buildPayload = (): IgSourceInput => ({
    ig_username: form.ig_username,
    display_name: form.display_name,
    category_slug: form.category_slug === '' ? null : form.category_slug,
    permission_status: form.permission_status,
    permission_date: isApproved ? form.permission_date || null : null,
    permission_memo: form.permission_memo === '' ? null : form.permission_memo,
    contact_info: form.contact_info === '' ? null : form.contact_info,
    is_active: isApproved ? form.is_active : false,
  })

  const handleSubmit = () => {
    if (!form.ig_username.trim()) {
      onError('IG ユーザー名は必須です')
      return
    }
    if (!form.display_name.trim()) {
      onError('表示名は必須です')
      return
    }

    const payload = buildPayload()
    startTransition(async () => {
      const result =
        state.mode === 'edit'
          ? await updateIgSource(state.source.id, payload)
          : await createIgSource(payload)

      if (result.success) {
        onSaved(isEdit ? 'アカウントを更新しました' : 'アカウントを登録しました')
      } else {
        onError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-2xl flex-col p-0">
        <DialogHeader className="border-b border-border-decorative px-6 py-4">
          <DialogTitle>
            {isEdit ? 'アカウントを編集' : '新規アカウント登録'}
          </DialogTitle>
          <DialogDescription>
            Cowork で取得対象とする Instagram アカウントを登録します。
            許可状態が「許可済み」のアカウントのみ取得設定を有効化できます。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {/* ig_username */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              IG ユーザー名 <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">@</span>
              <input
                type="text"
                value={form.ig_username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="iida_okonomiyaki_4rest"
                maxLength={30}
                className="flex-1 rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              半角英数字 / &quot;.&quot; / &quot;_&quot; のみ、1〜30 文字。先頭の &quot;@&quot; は自動で取り除かれます。
            </p>
          </div>

          {/* display_name */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              表示名 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => update('display_name', e.target.value)}
              placeholder="飯田お好み焼 4resT"
              maxLength={100}
              className="w-full rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* category */}
          <div>
            <label className="mb-1 block text-sm font-medium">カテゴリ</label>
            <select
              value={form.category_slug}
              onChange={(e) => update('category_slug', e.target.value)}
              className="w-full rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
            >
              <option value="">未指定</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}（{c.slug}）
                </option>
              ))}
            </select>
          </div>

          {/* permission_status */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              許可状態 <span className="text-red-600">*</span>
            </label>
            <select
              value={form.permission_status}
              onChange={(e) =>
                update('permission_status', e.target.value as IgPermissionStatus)
              }
              className="w-full rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
            >
              {PERMISSION_VALUES.map((v) => (
                <option key={v} value={v}>
                  {permissionLabels[v]}
                </option>
              ))}
            </select>
          </div>

          {/* permission_date — show only when approved */}
          {isApproved && (
            <div>
              <label className="mb-1 block text-sm font-medium">許可日</label>
              <input
                type="date"
                value={form.permission_date}
                onChange={(e) => update('permission_date', e.target.value)}
                className="w-full rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* permission_memo */}
          <div>
            <label className="mb-1 block text-sm font-medium">許可メモ</label>
            <textarea
              value={form.permission_memo}
              onChange={(e) => update('permission_memo', e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="DM 経由で許諾済み 等"
              className="w-full rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-right text-xs text-text-secondary">
              {form.permission_memo.length} / 1000
            </p>
          </div>

          {/* contact_info */}
          <div>
            <label className="mb-1 block text-sm font-medium">連絡先</label>
            <input
              type="text"
              value={form.contact_info}
              onChange={(e) => update('contact_info', e.target.value)}
              placeholder="メール / 電話 / SNS DM 等"
              maxLength={200}
              className="w-full rounded-md border border-border-decorative bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* is_active */}
          <div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="dialog-is-active"
                checked={form.is_active}
                onCheckedChange={(v) => update('is_active', v)}
                disabled={!isApproved}
              />
              <label
                htmlFor="dialog-is-active"
                className={`cursor-pointer text-sm font-medium ${
                  isApproved ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                取得を有効にする
              </label>
            </div>
            <p className="mt-2 pl-7 text-xs text-text-secondary">
              許可状態が「許可済み」のときのみ有効化できます。
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-border-decorative px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? '保存中...' : isEdit ? '更新' : '登録'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
