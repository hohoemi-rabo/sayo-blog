#!/usr/bin/env node
/**
 * Google Search Console API の読み取り専用ツール (Claude の分析用・手元で動かす)。
 *
 * 認証はサービスアカウント。鍵 (JSON) はリポジトリの外に置き、場所だけを .env.local の
 * GSC_KEY_FILE に書く。本番 (Vercel) には入れない = サイトからは使わない。
 * 依存を増やさないため、JWT の署名とトークン取得は Node 標準の crypto + fetch で行う。
 *
 * 使い方 (node --env-file=.env.local scripts/gsc.mjs <command> ...):
 *   sites                                   … サービスアカウントが見られるプロパティ
 *   sitemaps                                … 送信済みサイトマップの状態
 *   query [--days 28] [--dims page,query] [--limit 1000] [--page <url>] [--query <word>] [--type web|discover]
 *                                           … 検索パフォーマンス (表示回数・クリック・CTR・掲載順位)
 *   inspect <url>                           … URL 検査 (インデックス状況。1 日 2,000 件まで)
 * 出力は JSON (標準出力)。
 */
import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://www.googleapis.com/webmasters/v3'
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
const TIMEOUT_MS = 30_000

function fail(message) {
  console.error(`gsc: ${message}`)
  process.exit(1)
}

function loadKey() {
  const path = process.env.GSC_KEY_FILE
  if (!path) fail('GSC_KEY_FILE が未設定です (.env.local)。node --env-file=.env.local で実行してください')
  let key
  try {
    key = JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    fail(`鍵ファイルを読めません: ${path} (${err.message})`)
  }
  if (!key.client_email || !key.private_key) fail('鍵ファイルに client_email / private_key がありません')
  return key
}

const base64url = (input) => Buffer.from(input).toString('base64url')

async function fetchJson(url, init = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { raw: text.slice(0, 500) }
  }
  if (!res.ok) {
    const detail = body?.error?.message ?? body?.error_description ?? JSON.stringify(body).slice(0, 500)
    fail(`${res.status} ${url}\n${detail}`)
  }
  return body
}

async function getAccessToken() {
  const key = loadKey()
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(
    JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  )
  const signature = createSign('RSA-SHA256').update(`${header}.${claim}`).sign(key.private_key, 'base64url')
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: `${header}.${claim}.${signature}`,
  })
  const token = await fetchJson(TOKEN_URL, { method: 'POST', body })
  return token.access_token
}

function siteUrl() {
  const site = process.env.GSC_SITE_URL
  if (!site) fail('GSC_SITE_URL が未設定です (.env.local)')
  return site
}

function parseArgs(argv) {
  const opts = {}
  const rest = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) opts[argv[i].slice(2)] = argv[++i]
    else rest.push(argv[i])
  }
  return { opts, rest }
}

/** Search Console のデータは 2〜3 日遅れなので、終了日は 3 日前にする */
function dateRange(days) {
  const end = new Date(Date.now() - 3 * 86_400_000)
  const start = new Date(end.getTime() - (days - 1) * 86_400_000)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { startDate: fmt(start), endDate: fmt(end) }
}

async function main() {
  const [command, ...args] = process.argv.slice(2)
  const { opts, rest } = parseArgs(args)
  const token = await getAccessToken()
  const auth = { Authorization: `Bearer ${token}` }
  const site = encodeURIComponent(siteUrl())

  let result
  switch (command) {
    case 'sites':
      result = await fetchJson(`${API}/sites`, { headers: auth })
      break
    case 'sitemaps':
      result = await fetchJson(`${API}/sites/${site}/sitemaps`, { headers: auth })
      break
    case 'query': {
      const filters = []
      if (opts.page) filters.push({ dimension: 'page', operator: 'equals', expression: opts.page })
      if (opts.query) filters.push({ dimension: 'query', operator: 'contains', expression: opts.query })
      const request = {
        ...dateRange(Number(opts.days ?? 28)),
        dimensions: (opts.dims ?? 'page,query').split(',').filter(Boolean),
        rowLimit: Number(opts.limit ?? 1000),
        type: opts.type ?? 'web',
        ...(filters.length ? { dimensionFilterGroups: [{ filters }] } : {}),
      }
      const data = await fetchJson(`${API}/sites/${site}/searchAnalytics/query`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      result = { request, rows: data.rows ?? [] }
      break
    }
    case 'inspect': {
      if (!rest[0]) fail('inspect には URL を渡してください')
      result = await fetchJson(INSPECT_URL, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: rest[0], siteUrl: siteUrl(), languageCode: 'ja' }),
      })
      break
    }
    default:
      fail('コマンドは sites / sitemaps / query / inspect のどれかです (使い方はファイル冒頭)')
  }
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => fail(err.stack ?? String(err)))
