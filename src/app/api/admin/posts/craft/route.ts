import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import {
  generateCraftArticle,
  type CraftImageInput,
} from '@/lib/craft-article-generator'
import { ArticleAiValidationError } from '@/lib/article-ai-shared'
import {
  CRAFT_MAX_BYTES,
  CRAFT_MAX_FILES,
  isCraftAcceptMime,
} from '@/lib/craft-inputs'

// 抽出パス(vision) + 執筆パスの 2 回 Gemini を叩くため余裕を持たせる
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ ok: false, error: '不正なリクエスト' }, { status: 400 })
  }

  const memoRaw = form.get('memo')
  const memoText = typeof memoRaw === 'string' ? memoRaw : ''
  const rawFiles = form.getAll('flyers').filter((f): f is File => f instanceof File)

  if (rawFiles.length > CRAFT_MAX_FILES) {
    return NextResponse.json(
      { ok: false, error: `チラシは一度に最大 ${CRAFT_MAX_FILES} 枚までです` },
      { status: 400 }
    )
  }

  const images: CraftImageInput[] = []
  for (const f of rawFiles) {
    if (!isCraftAcceptMime(f.type)) {
      return NextResponse.json(
        { ok: false, error: '対応していないファイル形式です（JPEG / PNG / WebP / PDF）' },
        { status: 400 }
      )
    }
    if (f.size > CRAFT_MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'ファイルは 1 枚あたり 10MB までです' },
        { status: 400 }
      )
    }
    const buf = Buffer.from(await f.arrayBuffer())
    images.push({ base64: buf.toString('base64'), mimeType: f.type })
  }

  try {
    const result = await generateCraftArticle({ images, memoText })
    return NextResponse.json({
      ok: true,
      post_id: result.post_id,
      redirect: `/admin/posts/${result.post_id}`,
    })
  } catch (err) {
    const isValidation = err instanceof ArticleAiValidationError
    const message = err instanceof Error ? err.message : '記事生成に失敗しました'
    if (!isValidation) {
      console.error('[api/admin/posts/craft] failed:', err)
    }
    return NextResponse.json(
      { ok: false, error: message },
      { status: isValidation ? 400 : 500 }
    )
  }
}
