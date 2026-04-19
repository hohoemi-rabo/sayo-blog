import type { IgCaptionConfig } from './types'

export interface IgCaptionPromptInput {
  title: string
  category: string
  excerpt: string | null
  hashtags: string[]
  contentText: string
  articleUrl: string
  count: number
  config: IgCaptionConfig
}

const PERSONA = `あなたは南信州（飯田市・下伊那地域）の地域情報を発信するライター「FUNE」です。
親しみやすく温かみのある文体で、地域の魅力を伝えます。
場所やお店の紹介では情報型（住所・営業時間等があれば含める）で書いてください。`

const MULTI_VIEWPOINT_GUIDE = `各投稿は異なる切り口・視点で作成してください。
参考（3件の場合）:
  - 1件目: 記事全体の概要・紹介
  - 2件目: 特に印象的なエピソードやメニューの深掘り
  - 3件目: 読者への呼びかけ・来店促進
件数がこれ以上の場合は独自の切り口を考えて構いません。
各キャプションは独立して読めるようにしてください。`

/**
 * Build a single prompt that generates N Instagram captions + hashtags in one call.
 * Gemini returns JSON: { posts: [{ caption, hashtags }] } — both fields per sequence.
 */
export function buildCaptionPrompt(input: IgCaptionPromptInput): string {
  const {
    title,
    category,
    excerpt,
    hashtags,
    contentText,
    articleUrl,
    count,
    config,
  } = input

  const isMulti = count > 1
  const excludeList = config.required_hashtags.map((t) => t.replace(/^#/, '')).join(', ')

  return `${PERSONA}

以下のブログ記事の内容をもとに、Instagram投稿用のキャプション本文とハッシュタグを生成してください。

【ルール】
- 生成数: ${count}件
- キャプション本文: ${config.min_length}〜${config.max_length}文字
  - 挨拶 → 記事内容紹介 → 締めの流れで執筆
  - 記事の内容のみを使用し、情報を捏造しない
- ハッシュタグ: ${config.generated_hashtag_count}個（ちょうど${config.generated_hashtag_count}個）
  - #記号は含めず、タグ名のみを配列要素として返す
  - 以下のタグは既に必須として付与されるため、重複を避けてください: ${excludeList}
  - 地名・ジャンル・カテゴリ・体験軸など幅広い切り口で
  - 漢字・ひらがな・英数字のみ。スペース・絵文字は不可

【caption フィールドの絶対禁止事項】
システム側で以下を自動的に付与するため、caption 本文には一切含めないでください。
含まれている場合は不良品とみなされ、やり直しになります。

  ❌ ハッシュタグ（# で始まる単語）を本文に書かない — 必ず hashtags 配列で返す
  ❌ 必須ハッシュタグ（${excludeList}）を本文に書かない — システムが冒頭に自動付与
  ❌ 記事URL（${articleUrl}）を本文に書かない — システムが末尾に自動付与
  ❌ 「詳しくはブログで」「📍」といった誘導文を書かない — システムが自動付与
  ❌ 記事タイトル（${title}）をそのまま先頭に置かない — 本文は必ず「こんにちは」等の挨拶から始める

【良い caption 例】
"こんにちは、FUNEです。今回は飯田市のりんご並木沿いにある『カフェ三連蔵』さんを取材しました。..."

【悪い caption 例（禁止）】
"【飯田市】カフェ三連蔵のオリジナルカレー\\n#長野県飯田市 #sayosjournalブログ記事\\nこんにちは...\\nhttp://..."
${isMulti ? `\n【複数生成の指針】\n${MULTI_VIEWPOINT_GUIDE}\n` : ''}
【出力フォーマット】
以下のJSON形式のみで回答してください。説明文・コードブロック・マークダウンフェンスは一切含めないでください。

{
  "posts": [
    { "caption": "キャプション本文（${config.min_length}〜${config.max_length}文字、ハッシュタグ・URL・タイトル・誘導文なし）", "hashtags": ["タグ1", "タグ2", ...${config.generated_hashtag_count}個] }
  ]
}

【ブログ記事データ】
タイトル: ${title}
カテゴリ: ${category}
抜粋: ${excerpt ?? '（なし）'}
記事の既存ハッシュタグ（参考、本文に含めないこと）: ${hashtags.join(', ') || '（なし）'}
記事URL（本文に含めないこと）: ${articleUrl}
本文:
${contentText}
`
}

/**
 * Assemble the final Instagram caption string in the required format:
 *
 *   {required_hashtags_joined_by_space}
 *
 *   {caption_body}
 *
 *   📍詳しくはブログで
 *   {article_url}
 *
 *   #{generated_tag_1}
 *   #{generated_tag_2}
 *   ...
 */
export function assembleCaptionText(input: {
  body: string
  articleUrl: string
  requiredHashtags: string[]
  generatedHashtags: string[]
}): string {
  const { body, articleUrl, requiredHashtags, generatedHashtags } = input
  const headerLine = requiredHashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
  const tagLines = generatedHashtags
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
    .join('\n')

  return [
    headerLine,
    '',
    body.trim(),
    '',
    '📍詳しくはブログで',
    articleUrl,
    '',
    tagLines,
  ].join('\n')
}
