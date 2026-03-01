import { getGenerativeModel, getEmbeddingModel } from './gemini'
import type { KnowledgeMetadata } from './types'

const MAX_EMBEDDING_TEXT_LENGTH = 8000

interface ArticleInput {
  title: string
  content: string // HTML
  excerpt?: string
  category: string
  hashtags: string[]
  published_at: string
}

interface GenerateKnowledgeResult {
  metadata: KnowledgeMetadata
  content: string // structured markdown
}

const KNOWLEDGE_PROMPT = `あなたは南信州の地域情報ブログ「Sayo's Journal」のナレッジデータ生成アシスタントです。
記事のHTMLコンテンツを解析し、AI検索用の構造化データを生成してください。

以下のJSON形式で回答してください。他のテキストは含めないでください。

{
  "area": "記事に関連する地域（例: 飯田市・中心部、阿智村 など。記事内容から推定）",
  "summary": "記事の要約（2〜3文。記事の核心を伝える簡潔な説明）",
  "keywords": ["検索キーワード1", "キーワード2", ...],
  "spots": [
    {
      "name": "スポット名",
      "address": "住所（記事に記載があれば）",
      "phone": "電話番号（記事に記載があれば）",
      "hours": "営業時間（記事に記載があれば）",
      "note": "補足情報（記事に記載があれば）"
    }
  ],
  "content": "記事の内容を構造化マークダウンで記述。見出し(##)で整理し、要点を残す。HTMLタグは除去。スポット情報・料金・アクセス等の実用情報を重視。"
}

ルール:
- keywords は 5〜10 個。地名、料理名、店名、ジャンル等を含める
- spots は記事中に店舗や施設の情報があれば抽出。なければ空配列 []
- content はマークダウン形式。記事の情報をできるだけ保持しつつ、AI検索に適した形に整理
- 住所・電話番号・営業時間は正確に転記
- 不要な装飾（広告文言、SNSリンク等）は除去
- 回答は有効なJSONのみ。コードブロックやマークダウンのフェンスで囲まないでください
`

export async function generateKnowledge(
  article: ArticleInput
): Promise<GenerateKnowledgeResult> {
  const model = getGenerativeModel()

  const userMessage = `以下の記事を解析してナレッジデータを生成してください。

タイトル: ${article.title}
カテゴリ: ${article.category}
ハッシュタグ: ${article.hashtags.join(', ')}
公開日: ${article.published_at}

記事HTML:
${article.content}`

  const result = await model.generateContent([
    { text: KNOWLEDGE_PROMPT },
    { text: userMessage },
  ])

  const responseText = result.response.text()

  // Parse JSON response — strip markdown fences if present
  let jsonStr = responseText.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  let parsed: {
    area: string
    summary: string
    keywords: string[]
    spots: Array<{
      name: string
      address?: string
      phone?: string
      hours?: string
      note?: string
    }>
    content: string
  }

  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    // Retry with more explicit instruction
    const retryResult = await model.generateContent([
      {
        text: 'あなたの前回の回答はJSONとしてパースできませんでした。有効なJSONのみを返してください。コードブロックで囲まないでください。',
      },
      { text: KNOWLEDGE_PROMPT },
      { text: userMessage },
    ])
    const retryText = retryResult.response.text().trim()
    let retryJson = retryText
    if (retryJson.startsWith('```')) {
      retryJson = retryJson
        .replace(/^```(?:json)?\s*/, '')
        .replace(/\s*```$/, '')
    }
    parsed = JSON.parse(retryJson)
  }

  const metadata: KnowledgeMetadata = {
    title: article.title,
    category: article.category,
    hashtags: article.hashtags,
    published_at: article.published_at,
    area: parsed.area || '',
    summary: parsed.summary || '',
    keywords: parsed.keywords || [],
    spots: (parsed.spots || []).filter((s) => s.name?.trim()),
  }

  return {
    metadata,
    content: parsed.content || '',
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getEmbeddingModel()

  // Truncate if too long
  const truncated =
    text.length > MAX_EMBEDDING_TEXT_LENGTH
      ? text.slice(0, MAX_EMBEDDING_TEXT_LENGTH)
      : text

  const result = await model.embedContent(truncated)
  return result.embedding.values
}

export function buildEmbeddingText(
  title: string,
  summary: string,
  content: string
): string {
  return `${title} ${summary} ${content}`
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
