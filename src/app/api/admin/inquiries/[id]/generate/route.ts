import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import {
  generateMiniArticle,
  type GenerateMiniArticleInput,
} from '@/lib/mini-article-generator'
import { ArticleAiValidationError } from '@/lib/article-ai-shared'
import {
  SCREENSHOT_MAX_SLICES_PER_PAGE,
  SCREENSHOT_MAX_TOTAL_BASE64,
  totalScreenshotBase64Length,
  type PageScreenshot,
} from '@/lib/page-screenshots'

export const maxDuration = 60

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const { id } = await params

  let body: {
    snsTexts?: Array<{ url: string; text: string }>
    memoText?: string
    additionalImageUrls?: string[]
    screenshots?: PageScreenshot[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: '不正な JSON' }, { status: 400 })
  }

  const snsTexts = Array.isArray(body.snsTexts)
    ? body.snsTexts.filter(
        (s): s is { url: string; text: string } =>
          !!s && typeof s.url === 'string' && typeof s.text === 'string'
      )
    : []
  const additionalImageUrls = Array.isArray(body.additionalImageUrls)
    ? body.additionalImageUrls.filter((u): u is string => typeof u === 'string')
    : []

  const memoText = typeof body.memoText === 'string' ? body.memoText : ''

  const screenshots = Array.isArray(body.screenshots)
    ? body.screenshots.filter(
        (s): s is PageScreenshot =>
          !!s &&
          typeof s.url === 'string' &&
          Array.isArray(s.slices) &&
          s.slices.length > 0 &&
          s.slices.length <= SCREENSHOT_MAX_SLICES_PER_PAGE &&
          s.slices.every((b) => typeof b === 'string' && b.length > 0)
      )
    : []
  if (totalScreenshotBase64Length(screenshots) > SCREENSHOT_MAX_TOTAL_BASE64) {
    return NextResponse.json(
      { ok: false, error: 'スクショが大きすぎます。枚数を減らしてください' },
      { status: 400 }
    )
  }

  const input: GenerateMiniArticleInput = {
    inquiryId: id,
    snsTexts,
    memoText,
    additionalImageUrls,
    screenshots,
  }

  try {
    const result = await generateMiniArticle(input)
    return NextResponse.json({
      ok: true,
      post_id: result.post_id,
      redirect: `/admin/posts/${result.post_id}`,
    })
  } catch (err) {
    const isValidation = err instanceof ArticleAiValidationError
    const message =
      err instanceof Error ? err.message : '記事生成に失敗しました'
    if (!isValidation) {
      console.error('[api/admin/inquiries/generate] failed:', err)
    }
    return NextResponse.json(
      { ok: false, error: message },
      { status: isValidation ? 400 : 500 }
    )
  }
}
