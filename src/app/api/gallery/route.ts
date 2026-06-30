import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { GALLERY_PAGE_SIZE, type GalleryImage } from '@/lib/gallery'

/**
 * 公開ギャラリーの追加読込 API。RPC `get_gallery_images` をラップして JSON 返却。
 * 公開済み & 表示ON のフィルタは RPC (SECURITY DEFINER) 側で固定。
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
  const limit = Math.min(
    60,
    Math.max(1, parseInt(searchParams.get('limit') || String(GALLERY_PAGE_SIZE), 10) || GALLERY_PAGE_SIZE)
  )
  // 初回ページ (SSR) と同じシードを渡してもらい、同じランダム並びでページングする
  const seed = searchParams.get('seed') || ''

  const supabase = createClient()
  // 1 件多めに取って hasMore を判定
  const { data, error } = await supabase.rpc('get_gallery_images', {
    p_limit: limit + 1,
    p_offset: offset,
    p_seed: seed,
  })

  if (error) {
    console.error('[api/gallery] rpc error:', error)
    return NextResponse.json({ images: [], hasMore: false })
  }

  const rows = (data ?? []) as GalleryImage[]
  const hasMore = rows.length > limit
  const images = hasMore ? rows.slice(0, limit) : rows

  return NextResponse.json({ images, hasMore })
}
