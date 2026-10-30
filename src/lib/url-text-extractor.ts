/**
 * 投稿記事の依頼で送られてきた URL を取得し、記事化の素材になる本文テキストを取り出す (Server 専用)。
 *
 * 目的は紗代さんの「URL を開いてコピーして貼る」手間を無くすこと。
 * ただし Instagram 等のログイン壁や、表示後に JS で中身を読み込むページは取れないので、
 * 結果を ok / partial / failed で返し、取れなかった分だけ手で貼ってもらう前提にしている。
 *
 * HTML パーサは使わず正規表現で抜く (AI に渡す素材なので、多少ナビ等が混じっても問題ない)。
 */

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const FETCH_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 3
const MAX_BYTES = 2 * 1024 * 1024
/** AI に渡す 1 URL あたりの上限。長い一覧ページでプロンプトが膨らみすぎないように */
const MAX_TEXT_CHARS = 8_000
/** これ未満の本文しか取れなければ「中身は取れていない」とみなす */
const MIN_BODY_CHARS = 200

const USER_AGENT =
  'Mozilla/5.0 (compatible; HOISA-ArticleDraft/1.0; +https://www.sayo-kotoba.com)'

export type UrlTextStatus = 'ok' | 'partial' | 'failed'

export interface UrlTextResult {
  url: string
  status: UrlTextStatus
  /** 貼り付け欄にそのまま入れるテキスト (failed は空) */
  text: string
  /** partial / failed のとき、紗代さん向けの理由 */
  reason: string | null
}

export async function extractUrlText(url: string): Promise<UrlTextResult> {
  try {
    const html = await fetchHtml(url)
    return buildResult(url, html)
  } catch (err) {
    return {
      url,
      status: 'failed',
      text: '',
      reason: err instanceof UrlFetchError ? err.message : '取得に失敗しました',
    }
  }
}

class UrlFetchError extends Error {}

// ------------------------------------------------------------
// 取得 (SSRF 対策つき)
// ------------------------------------------------------------

/**
 * 依頼者が自由に入力した URL を取りに行くので、内部ネットワーク宛てを拒否する。
 * リダイレクト先も毎回検査するため、redirect は手動で辿る。
 * (DNS の再解決による差し替えまでは防いでいない。管理者操作でしか動かないため許容)
 */
async function fetchHtml(rawUrl: string): Promise<string> {
  let url = rawUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = parsePublicHttpUrl(url)
    await assertPublicHost(parsed.hostname)

    let res: Response
    try {
      res = await fetch(parsed, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.8' },
      })
    } catch {
      throw new UrlFetchError('サイトに接続できませんでした')
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new UrlFetchError('転送先が不明でした')
      url = new URL(location, parsed).toString()
      continue
    }
    if (!res.ok) {
      throw new UrlFetchError(`サイトが応答しませんでした (HTTP ${res.status})`)
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      throw new UrlFetchError('Web ページではありませんでした (画像や PDF など)')
    }
    return decodeBody(await readLimited(res), contentType)
  }
  throw new UrlFetchError('転送が多すぎました')
}

function parsePublicHttpUrl(raw: string): URL {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new UrlFetchError('URL の形式が正しくありません')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UrlFetchError('http / https 以外の URL です')
  }
  return parsed
}

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, '')
  let addresses: string[]
  if (isIP(host)) {
    addresses = [host]
  } else {
    try {
      addresses = (await lookup(host, { all: true })).map((a) => a.address)
    } catch {
      throw new UrlFetchError('サイトが見つかりませんでした')
    }
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new UrlFetchError('取得できない宛先です')
  }
}

function isPrivateAddress(address: string): boolean {
  const v4 = address.startsWith('::ffff:') ? address.slice(7) : address
  if (isIP(v4) === 4) {
    const [a, b] = v4.split('.').map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local / クラウドのメタデータ
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    )
  }
  const v6 = address.toLowerCase()
  return (
    v6 === '::' ||
    v6 === '::1' ||
    v6.startsWith('fc') ||
    v6.startsWith('fd') ||
    v6.startsWith('fe80')
  )
}

async function readLimited(res: Response): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array()
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BYTES) {
      // 大きすぎるページは先頭だけで十分 (本文は前半にあることが多い)
      await reader.cancel()
      break
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

/** 地域のサイトは Shift_JIS / EUC-JP もまだあるので、header → meta の順で文字コードを決める */
function decodeBody(bytes: Uint8Array, contentType: string): string {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 4096))
  const charset =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ??
    'utf-8'
  try {
    return new TextDecoder(charset.toLowerCase()).decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

// ------------------------------------------------------------
// 本文の取り出し
// ------------------------------------------------------------

function buildResult(url: string, html: string): UrlTextResult {
  const title = metaContent(html, 'og:title') ?? tagText(html, 'title')
  const description =
    metaContent(html, 'og:description') ?? metaContent(html, 'description')
  const body = extractBodyText(html)

  const header = [
    title && `タイトル: ${title}`,
    description && description !== body.slice(0, description.length)
      ? `説明: ${description}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')
  const text = [header, body].filter(Boolean).join('\n\n').slice(0, MAX_TEXT_CHARS)

  if (body.length >= MIN_BODY_CHARS) {
    return { url, status: 'ok', text, reason: null }
  }
  // タイトルだけでは素材にならない (JS で差し込む前の雛形が残っていることもある)。
  // 説明文があれば Instagram の og:description のように投稿文が入っていることがあるので活かす
  if (description) {
    return {
      url,
      status: 'partial',
      text,
      reason:
        'タイトルや説明文しか取れませんでした (ログインが必要なサイトか、表示後に中身を読み込むページの可能性)',
    }
  }
  return {
    url,
    status: 'failed',
    text: '',
    reason:
      '中身を取得できませんでした (ログインが必要なサイトか、表示後に中身を読み込むページの可能性)',
  }
}

function metaContent(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
    'i'
  )
  const tag = re.exec(html)?.[0]
  const content = tag && /content=["']([^"']*)["']/i.exec(tag)?.[1]
  return content ? cleanInline(content) || null : null
}

function tagText(html: string, tag: string): string | null {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(html)
  return m ? cleanInline(m[1]) || null : null
}

function extractBodyText(html: string): string {
  const withoutNoise = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(
      /<(script|style|noscript|template|svg|iframe|nav|footer|form)\b[\s\S]*?<\/\1>/gi,
      ' '
    )
  const withBreaks = withoutNoise
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol|h[1-6]|tr|td|th|section|article|dt|dd|blockquote|figcaption)\b[^>]*>/gi, '\n')
  const lines = decodeEntities(withBreaks.replace(/<[^>]+>/g, ' '))
    .split('\n')
    .map((l) => l.replace(/[ \t　 ]+/g, ' ').trim())
    .filter(Boolean)

  // 同じ行の連続 (PC/スマホ用の二重メニュー等) を 1 つにする
  const deduped = lines.filter((l, i) => l !== lines[i - 1])
  return deduped.join('\n')
}

function cleanInline(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function safeCodePoint(n: number): string {
  try {
    return String.fromCodePoint(n)
  } catch {
    return ''
  }
}
