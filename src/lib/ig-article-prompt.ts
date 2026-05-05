/**
 * Prompt builder for AI 記事再構成 (Ticket 37).
 *
 * Takes an Instagram post + its source account info and produces a Gemini
 * prompt that returns a JSON-formatted article draft including structured
 * event metadata extraction.
 */

export interface BuildArticlePromptInput {
  displayName: string
  igUsername: string
  caption: string
  igPostedAt: string
  igPostUrl: string
  imageCount: number
  categories: Array<{ slug: string; name: string }>
}

const PERSONA = `あなたは南信州（飯田市・下伊那地域）の地域情報を発信するライター「FUNE」です。
親しみやすく温かみのある文体で、場所・お店・取材体験を、自分の感想や小さなエピソードと一緒に語る作風です。`

export function buildArticleFromIgPrompt(input: BuildArticlePromptInput): string {
  const categoriesList = input.categories
    .map((c) => `- ${c.slug} (${c.name})`)
    .join('\n')

  const igPostedAtDisplay = formatDateForPrompt(input.igPostedAt)
  const creditTemplate = buildCreditTemplate(input)

  return `${PERSONA}

以下の Instagram 投稿をもとに、ブログ記事の下書きを **JSON 形式のみ** で作成してください。
本ブログは「飯田下伊那のイベント情報を一元的に届ける」ことを目的としているため、
キャプション中の開催日・会場・料金などのイベント情報を構造化して抽出してください。

【ルール】
- FUNE の語り口調（親しみやすく温かみのある文体）
- Instagram 投稿の情報のみを使用し、情報を捏造しない
- 情報量が少ない場合、無理に長い記事にせず、適切な箇所に「※ここに追加取材の内容を加筆してください」を挿入
- 本文 HTML はセクション構造（h2 見出し → 説明）で書く
- 記事末尾にクレジットセクションを必ず含める（下記フォーマット）
- JSON 以外のテキスト・説明・マークダウンフェンスは絶対に出力しない

【イベント情報の抽出ルール】
キャプション中に開催日 + 会場 が含まれていればイベント記事として扱い、is_event=true、関連フィールドを埋める。
含まれていない（普通の紹介投稿）なら is_event=false で関連フィールドはすべて null。

- event_date_start / event_date_end: ISO 形式 YYYY-MM-DD
  - 単日開催 → start のみ、end は null
  - 複数日開催（例: 3/22-23） → start と end 両方
  - 「来月」「今度の土曜」など相対表記しかない場合 → null（is_event=true でも OK、extraction_note に記録）
  - 「毎週土曜」など定期開催 → null + extraction_note にメモ
- event_time_start / event_time_end: 自由記述 ("10:00", "10時〜")
- event_venue: 会場名（例: "丘の上結いスクエア"）
- event_address: 住所（あれば）
- event_fee: 料金（"無料", "500円", "大人 1000円・子供 500円" 等の自由表記）
- event_url: 公式サイトや申込フォームの URL（キャプション中にあれば）
- extraction_note: 抽出に関する補足（曖昧な日付などの人間レビュー用メモ）

【出力 JSON スキーマ】
{
  "title": "記事タイトル（15〜40字、イベントなら【日付】や【飯田市】等の修飾を含めて良い）",
  "excerpt": "記事抜粋（80〜150字）",
  "content_html": "<h2>...</h2><p>...</p>（Tiptap 互換: h2, h3, p, ul, ol, li, strong, em, a, hr）",
  "recommended_category_slug": "既存カテゴリから1つ（イベントなら 'event' 推奨）",
  "recommended_hashtags": ["タグ1", "タグ2"]（5〜10 個、# なし、日本語可）,
  "event": {
    "is_event": true,
    "event_date_start": "YYYY-MM-DD",
    "event_date_end": null,
    "event_time_start": "10:00",
    "event_time_end": "16:00",
    "event_venue": "...",
    "event_address": "...",
    "event_fee": "...",
    "event_url": "https://...",
    "extraction_note": null
  }
}
※ is_event=false の場合は event 以下の各フィールドはすべて null にしてください。

【クレジットフォーマット（content_html 末尾に必ず含める）】
${creditTemplate}

【既存カテゴリ一覧】
${categoriesList}

【Instagram 投稿データ】
投稿者: ${input.displayName}（@${input.igUsername}）
投稿日: ${igPostedAtDisplay}
画像枚数: ${input.imageCount}（記事内には採用された画像のみが配置される）
投稿URL: ${input.igPostUrl}

キャプション:
${input.caption}
`
}

function buildCreditTemplate(input: BuildArticlePromptInput): string {
  const profileUrl = `https://www.instagram.com/${input.igUsername}/`
  return `<hr>
<p class="credit">
  この記事は <strong>${escapeHtml(input.displayName)}</strong> さん（<a href="${profileUrl}" target="_blank" rel="noopener noreferrer">@${input.igUsername}</a>）の Instagram 投稿を元に作成しました。<br>
  元投稿: <a href="${input.igPostUrl}" target="_blank" rel="noopener noreferrer">${input.igPostUrl}</a>
</p>`
}

function formatDateForPrompt(iso: string): string {
  if (!iso) return '不明'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
