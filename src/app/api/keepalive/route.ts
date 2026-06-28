import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Vercel Cron から 1 日 1 回叩く Supabase スリープ防止用エンドポイント。
// 単に 200 を返すだけでは「DB の活動」にならないため、必ず実テーブルへ軽量クエリを投げる。
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Vercel Cron が自動付与する Authorization: Bearer ${CRON_SECRET} を検証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  // categories はマスター系で常にデータが入っている。head:true / count:'exact' で
  // 行データを転送せずカウントだけ取得する最軽量クエリ。
  const { count, error } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('[keepalive] Supabase query failed:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    count,
    timestamp: new Date().toISOString(),
  })
}
