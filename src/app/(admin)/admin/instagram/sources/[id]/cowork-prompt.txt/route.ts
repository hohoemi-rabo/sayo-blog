import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getIgSourceById } from '@/app/(admin)/admin/instagram/sources/actions'
import type { IgSource } from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const { id } = await params
  const source = await getIgSourceById(id)
  if (!source) {
    return new NextResponse('Source not found', { status: 404 })
  }

  const text = buildCoworkPrompt(source)
  return new NextResponse(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="cowork-prompt-${source.ig_username}.txt"`,
      'Cache-Control': 'no-store',
    },
  })
}

function buildCoworkPrompt(source: IgSource): string {
  return `以下の Instagram アカウントの最新投稿を CSV と画像で取得してください。

【対象アカウント】@${source.ig_username}（${source.display_name}）
【取得件数】最新 10 件

【CSV 形式】UTF-8 (BOM なし)、以下の列で出力
post_id,posted_at,username,caption,image_files,permalink,like_count,comment_count

【列の説明】
- post_id: IG 投稿 ID（unique）
- posted_at: 投稿日時 (ISO 8601: YYYY-MM-DDTHH:MM:SS)
- username: アカウント名 (@ なし) — 必ず "${source.ig_username}" となること
- caption: キャプション全文（改行・絵文字保持、ダブルクォートで囲む）
- image_files: 画像ファイル名（カンマ区切り、表示順）
- permalink: IG 投稿 URL
- like_count: いいね数（数値）
- comment_count: コメント数（数値）

【画像ファイル名】{post_id}_{連番}.{拡張子}
  例: ${source.ig_username}_1.jpg, ${source.ig_username}_2.jpg
  ※ 推奨形式。CSV の image_files 列の値とアップロードファイル名が完全一致していれば任意の命名で可。

【出力】
- CSV ファイル 1 つ
- 画像ファイルを別フォルダにダウンロード（CSV の image_files 列の値とファイル名を完全一致させる）

【注意】
- caption はダブルクォートで囲み、改行・絵文字は元のまま保持
- 動画投稿・ストーリーは対象外（通常投稿のみ）
- カルーセル投稿は image_files に複数ファイル名をカンマ区切りで列挙
- 画像のダウンロードに失敗した投稿は CSV にも含めないこと
- 拡張子は jpg / jpeg / png / webp のいずれか、各ファイル 10MB 以内
`
}
