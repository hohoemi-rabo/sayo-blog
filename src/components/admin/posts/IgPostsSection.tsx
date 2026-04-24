'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Plus, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { GenerateDialog } from '@/app/(admin)/admin/instagram/posts/_components/GenerateDialog'
import type { ImportedOrigin } from '@/app/(admin)/admin/posts/actions'
import type { IgPostStatus, IgPostWithRelations } from '@/lib/types'

interface IgPostsSectionProps {
  postId: string
  postTitle: string
  initialIgPosts: IgPostWithRelations[]
  totalIgPosts: number
  importedOrigin: ImportedOrigin | null
}

const STATUS_STYLES: Record<IgPostStatus, { label: string; className: string }> = {
  draft: {
    label: '下書き',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  published: {
    label: '投稿済み',
    className: 'bg-green-50 text-green-700 border-green-300',
  },
  manual_published: {
    label: '手動投稿済み',
    className: 'bg-blue-50 text-blue-700 border-blue-300',
  },
}

export function IgPostsSection({
  postId,
  postTitle,
  initialIgPosts,
  totalIgPosts,
  importedOrigin,
}: IgPostsSectionProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [generateOpen, setGenerateOpen] = useState(false)

  const listHref = `/admin/instagram/posts?post_id=${postId}`

  return (
    <>
      <Card className="p-6 bg-white">
        <h3 className="font-semibold text-text-primary mb-4">
          📷 Instagram 投稿
        </h3>

        <p className="text-sm text-text-secondary">
          この記事に紐づく IG 下書き:{' '}
          <span className="font-medium text-text-primary">{totalIgPosts}</span> 件
        </p>

        {initialIgPosts.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {initialIgPosts.map((item) => {
              const status = STATUS_STYLES[item.status]
              const imageUrl = item.image_url ?? item.post?.thumbnail_url ?? null
              return (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-md border border-border-decorative bg-background/40 p-2"
                >
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded bg-background-dark/5">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-text-secondary">
                        画像なし
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-text-primary">
                        #{item.sequence_number}
                      </span>
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-text-secondary">
                      {item.caption}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-md border border-dashed border-border-decorative py-4 text-center text-xs text-text-secondary">
            下書きはまだありません
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setGenerateOpen(true)}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            追加生成
          </Button>
          <Link href={listHref} className="inline-flex">
            <Button type="button" variant="outline" size="sm" className="gap-1">
              <ArrowRight className="h-3.5 w-3.5" />
              一覧へ
            </Button>
          </Link>
        </div>

        {importedOrigin && (
          <div className="mt-5 rounded-md border border-border-decorative bg-background/40 p-3">
            <h4 className="text-xs font-semibold text-text-primary">
              📥 元 Instagram 投稿
            </h4>
            <p className="mt-1 text-xs text-text-secondary">
              この記事は{' '}
              <span className="font-medium text-text-primary">
                @{importedOrigin.ig_username}
              </span>
              （{importedOrigin.display_name}）の Instagram 投稿から生成されました。
            </p>
            {importedOrigin.ig_post_url && (
              <a
                href={importedOrigin.ig_post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                元投稿を開く
              </a>
            )}
          </div>
        )}
      </Card>

      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        lockedPostId={postId}
        lockedPostTitle={postTitle}
        onGenerated={(count) => {
          addToast(`${count} 件の下書きを生成しました`, 'success')
          router.refresh()
        }}
        onError={(message) => addToast(message, 'error', 5000)}
      />
    </>
  )
}
