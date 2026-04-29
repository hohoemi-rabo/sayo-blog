import { NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'

// 先頭の ﻿ は UTF-8 BOM。
// Excel など Windows 系の CSV ビューアが Shift_JIS と誤判定して
// 文字化けするのを防ぐため、サンプル DL のみ BOM 付きで配信する。
// アップロード側 (ig-csv-parser.ts) は BOM を読み飛ばす実装なので、
// この sample.csv をそのまま再アップロードしても問題なく取り込める。
const SAMPLE_CSV = `﻿post_id,posted_at,username,caption,image_files,permalink,like_count,comment_count
DGsample001,2026-03-10T14:30:00,iida_okonomiyaki_4rest,"お好み焼4resTさん🔥投稿その2
@iida_okonomiyaki_4rest

鉄板の上で
くるっ、じゅわぁ〜✨

#飯田グルメ #お好み焼き","DGsample001_1.jpg,DGsample001_2.jpg",https://www.instagram.com/p/DGsample001/,42,3
DGsample002,2026-03-09T10:15:00,iida_okonomiyaki_4rest,"単一画像サンプル","DGsample002_1.jpg",https://www.instagram.com/p/DGsample002/,18,1
`

export async function GET() {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  return new NextResponse(SAMPLE_CSV, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sample-ig-import.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
