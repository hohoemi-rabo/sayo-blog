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
  /**
   * When provided, the prompt frames the task as "create one IG post focused
   * on this section of the article". The full article text is not passed —
   * only the section body is supplied via contentText.
   */
  sectionHeading?: string
}

const PERSONA = `あなたは南信州（飯田市・下伊那地域）の地域情報を発信するライター「FUNE」です。
SNS（Instagram @fune.iida.toyooka.odekake）では、親しみやすくエッセイ調の文体で投稿しています。
場所・お店・取材体験を、自分の感想や小さなエピソードと一緒に語る作風です。`

const STYLE_GUIDE = `【FUNE の Instagram 文体ルール】

■ 冒頭
- 1行目は「📍【飯田市・地名】」または「飯田市発祥の〜」のように、場所・テーマから入る
- 「こんにちは」「FUNEです」のような自己紹介・挨拶は書かない
- 記事タイトルや見出しをそのまま貼らない

■ 改行
- 1〜2文ごとに改行する（1段落 = 1〜3行が基本）
- 意味のかたまりが変わるところで「空行」を入れて読みやすく
- 長い1段落のベタ打ちは禁止

■ 絵文字
- 文末・行末にさりげなく添える（🌸🍵🌿🍶🍜🔥✨🤭😋💦🍂🚗🍎 等）
- 1行に2個までを目安に、使いすぎない
- 飾りではなく「気持ちの抑揚」を表現する道具として使う

■ 構成（柔軟、必須ではない）
- 導入（場所・テーマ）→ 体験談・感想・気づき → 締め（読者へのひとこと、思いの余韻）
- 取材エピソード、個人的な思い出、ちょっとした余談を混ぜてOK
- 情報羅列ではなく「物語」として読ませる

■ 締め
- 「〜してみてくださいね🌸」「ぜひ読んでもらえたら嬉しいです」など、押し付けない誘い方
- 「詳しくはブログで」「📍」「URL」「プロフィールリンクから」は書かない（システムが自動付与する）
- 必須ハッシュタグも書かない（システムが自動付与する）

【良い例 1（短め・体験談型）】
📍【飯田市・上郷黒田】
今回は、らぁめん髙橋さんに取材させていただきました🍜

飯田に引っ越してきて間もない頃、まだ何もわからない土地で、はじめて伺ったラーメン屋さんがここでした。
とびきり自分好みの味で、「あ、この土地でちゃんとやっていけそう」って心がふと軽くなったことを、今でもよく覚えています。

その"おいしさの理由"を、今回じっくり伺うことができました🌸
"知らなくてもおいしいけど、知ったらもっとおいしくなる"そんなお店の物語を、これからも届けていけたらと思います。

【良い例 2（紹介型）】
飯田市発祥の老舗食品メーカー「旭松食品」さん🌿
11月3日の"こうや豆腐の日"に合わせて、天竜工場内の直営店「新あさひ屋」を取材させていただきました。

並んでいたのは、どこか懐かしい高野豆腐の数々。
取材で一番びっくりしたのは……
今年がもう、あと60日しかないこと💦

そろそろ年末年始の準備をしなくちゃですね🍶`

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
    sectionHeading,
  } = input

  const isMulti = count > 1
  const isSectionMode = Boolean(sectionHeading && sectionHeading.trim())
  const excludeList = config.required_hashtags.map((t) => t.replace(/^#/, '')).join(', ')

  const sectionFocus = isSectionMode
    ? `\n【今回のフォーカス】\n記事全体ではなく、以下の見出しセクションだけを取り上げて 1 件の Instagram 投稿を作成してください。\n見出し: ${sectionHeading}\n※ このセクションで扱うテーマを主題にし、他のセクションの内容には触れないこと。\n※ 見出しそのものをキャプション冒頭に書かず、FUNE の語り口に自然に溶け込ませること。\n`
    : ''

  return `${PERSONA}

${STYLE_GUIDE}
${sectionFocus}
以下のブログ記事の内容をもとに、上記の FUNE 文体ルールに沿った Instagram 投稿用のキャプション本文とハッシュタグを生成してください。

【生成ルール】
- 生成数: ${count}件
- キャプション本文: ${config.min_length}〜${config.max_length}文字
  - 必ず複数行に改行し、適度に空行を入れる（ベタ打ち禁止）
  - 文末・要所に絵文字を添える（🌸🍵🌿🍶🍜🔥✨🤭😋💦 等）
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
  ❌ 「詳しくはブログで」「プロフィールリンクから」「▼記事は〜」等の誘導文 — システムが自動付与
  ❌ 記事タイトル（${title}）をそのまま先頭に貼らない
  ❌ 「こんにちは」「FUNEです」等の挨拶・自己紹介
${isMulti ? `\n【複数生成の指針】\n${MULTI_VIEWPOINT_GUIDE}\n` : ''}
【出力フォーマット】
以下のJSON形式のみで回答してください。説明文・コードブロック・マークダウンフェンスは一切含めないでください。
caption 内の改行は必ず "\\n" でエスケープしてください。

{
  "posts": [
    { "caption": "キャプション本文（${config.min_length}〜${config.max_length}文字、改行あり、絵文字あり、ハッシュタグ・URL・タイトル・挨拶なし）", "hashtags": ["タグ1", "タグ2", ...${config.generated_hashtag_count}個] }
  ]
}

【ブログ記事データ】
記事タイトル: ${title}
カテゴリ: ${category}
${excerpt ? `記事抜粋: ${excerpt}\n` : ''}記事の既存ハッシュタグ（参考、本文に含めないこと）: ${hashtags.join(', ') || '（なし）'}
記事URL（本文に含めないこと）: ${articleUrl}
${isSectionMode ? `\n【このセクションの本文】\n見出し: ${sectionHeading}\n---\n${contentText}` : `本文:\n${contentText}`}
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
