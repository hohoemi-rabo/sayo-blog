/**
 * 公開フォーム向けの簡易レート制限。
 *
 * in-memory Map による IP 単位の制限。
 * 注意: サーバーレス環境ではインスタンスごとに Map が独立するため厳密ではない。
 *   低トラフィックな個人ブログでの「連投抑止」を目的とした MVP 実装。
 *   厳密な制限が必要になったら Vercel KV / Upstash 等へ移行する。
 */

interface Bucket {
  count: number
  /** ウィンドウの開始時刻 (epoch ms) */
  windowStart: number
}

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 5 * 60 * 1000 // 5 分
const MAX_REQUESTS = 3 // 同一キーから 5 分間に 3 件まで

/**
 * 制限内なら true、超過していたら false を返す。
 * true を返すときは内部カウンタを 1 つ進める (= 1 リクエスト消費)。
 */
export function checkRateLimit(
  key: string,
  options?: { windowMs?: number; max?: number }
): boolean {
  const windowMs = options?.windowMs ?? WINDOW_MS
  const max = options?.max ?? MAX_REQUESTS
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now })
    return true
  }

  if (bucket.count >= max) {
    return false
  }

  bucket.count += 1
  return true
}
