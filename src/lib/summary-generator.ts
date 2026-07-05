/**
 * 記事本文から「さくっと / ほどよく / じっくり」の3段階 AI 要約を生成する。
 *
 * Gemini 呼び出しは既存の共通基盤 `article-ai-shared.ts::callGeminiParsed`
 * (3回リトライ + 指数バックオフ内蔵、内部で getGenerativeModel() を使う) に委譲する。
 * 新しい Gemini クライアントやモデル定数は作らない (モデルは env GEMINI_MODEL)。
 *
 * 本文は Tiptap の HTML なので、プロンプト投入前に必ずタグを除去する。
 */

import { callGeminiParsed } from '@/lib/article-ai-shared'
import {
  SUMMARY_LEVELS,
  SUMMARY_LEVEL_ORDER,
  type SummaryLevel,
} from '@/lib/summary-levels'

export type { SummaryLevel } from '@/lib/summary-levels'

export interface Summaries {
  short: string
  medium: string
  long: string
}

/** Tiptap HTML からタグを除去し、要約プロンプトに渡せる素のテキストにする */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

const SHARED_RULES = [
  '親しみやすい、ふつうの日本語の文章で書く。',
  '箇条書き・見出し・記号の装飾・HTML タグは使わない。',
  '本文に書かれていない事実や数値を足さない (捏造しない)。',
  '指定された文字数と改行ルールを厳守する。',
  '要約本文だけを出力し、「以下が要約です」などの前置きや後置きは書かない。',
].join('\n- ')

/** 1レベルぶんのプロンプトを組み立てる */
function buildSinglePrompt(body: string, level: SummaryLevel): string {
  const cfg = SUMMARY_LEVELS[level]
  return `あなたは記事の編集者です。次の記事本文を、読者が読む前に内容をつかめる要約にしてください。

# 要約の長さ・体裁
${cfg.instruction}

# 守るルール
- ${SHARED_RULES}

# 記事本文
${body}

上記ルールに従い、要約本文のみを出力してください。`
}

/** 3レベル一括のプロンプトを組み立てる (区切りマーカーでパースする) */
function buildBatchPrompt(body: string): string {
  const spec = SUMMARY_LEVEL_ORDER.map((lv) => {
    const cfg = SUMMARY_LEVELS[lv]
    return `【${cfg.label}】${cfg.instruction}`
  }).join('\n')

  return `あなたは記事の編集者です。次の記事本文から、長さの違う3段階の要約を作ってください。

# 3段階の要約
${spec}

# 守るルール
- ${SHARED_RULES}

# 記事本文
${body}

# 出力フォーマット (この形式を厳守。各要約の本文のみを該当セクションに書く)
===さくっと===
(さくっとの要約)
===ほどよく===
(ほどよくの要約)
===じっくり===
(じっくりの要約)
===終わり===`
}

/** 一括レスポンスを区切りマーカーで分割する。取れなければ空文字。 */
function parseBatch(raw: string): Summaries {
  const pick = (start: string, end: string): string => {
    const re = new RegExp(
      `===${start}===\\s*([\\s\\S]*?)\\s*===${end}===`,
      'i'
    )
    const m = raw.match(re)
    return m ? m[1].trim() : ''
  }
  return {
    short: pick('さくっと', 'ほどよく'),
    medium: pick('ほどよく', 'じっくり'),
    long: pick('じっくり', '終わり'),
  }
}

/** 指定レベル1つの要約を生成して返す */
export async function generateSingleSummary(
  body: string,
  level: SummaryLevel
): Promise<string> {
  const text = stripHtml(body)
  if (!text) {
    throw new Error('本文が空のため要約を生成できません。')
  }
  return callGeminiParsed(
    buildSinglePrompt(text, level),
    (raw) => raw.trim(),
    `summary:${level}`
  )
}

/** 3レベルを一括生成して返す (取れなかったレベルは空文字) */
export async function generateSummaries(body: string): Promise<Summaries> {
  const text = stripHtml(body)
  if (!text) {
    throw new Error('本文が空のため要約を生成できません。')
  }
  return callGeminiParsed(buildBatchPrompt(text), parseBatch, 'summary:batch')
}
