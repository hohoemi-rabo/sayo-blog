/**
 * Prompt builder for ミニ記事生成 (Ticket 41).
 *
 * 入力ソースが「IG 投稿 1 件」(Ticket 37) から
 * 「地域の方が窓口に寄せた SNS 本文 最大 5 件 + 種別 + 画像枚数」に変わる。
 * 出力 JSON スキーマは IG 記事生成と共通 (IgArticleAiOutput)。
 *
 * IG 記事との主な違い:
 * - 短い紹介記事 (400〜800 字)、h2 見出しを使わず 1 本の流れる文章
 * - クレジット表記は付けない (窓口に持ち込まれた情報のため)
 * - 種別に応じてトーンを調整
 */

import type { MiniInquiryType } from '@/lib/types'

export interface BuildMiniArticlePromptInput {
  inquiryType: MiniInquiryType
  inquiryTypeOther: string | null
  snsTexts: Array<{ url: string; text: string }>
  imageCount: number
  categories: Array<{ slug: string; name: string }>
  preferredPublishDate: string | null
}

const PERSONA = `あなたは南信州（飯田市・下伊那地域）の地域情報を発信するライター「FUNE」です。
親しみやすく温かみのある文体で、場所・お店・取材体験を、自分の感想や小さなエピソードと一緒に語る作風です。`

const TYPE_TONE: Record<MiniInquiryType, string> = {
  event: 'イベント告知。開催情報（日付・場所・料金）を文章の前半で分かりやすく伝える。',
  shop: 'お店の紹介。お店の特徴・場所・営業情報・雰囲気を温かく伝える。',
  group: '団体・活動の紹介。活動内容・思い・連絡先や参加方法を伝える。',
  other: '内容に応じて柔軟に。読み手が「知ってよかった」と思える紹介にする。',
}

export function buildMiniArticlePrompt(input: BuildMiniArticlePromptInput): string {
  const categoriesList = input.categories
    .map((c) => `- ${c.slug} (${c.name})`)
    .join('\n')

  const typeLabel =
    input.inquiryType === 'other' && input.inquiryTypeOther
      ? `その他（${input.inquiryTypeOther}）`
      : input.inquiryType

  const snsBlock =
    input.snsTexts.length === 0
      ? '（本文は提供されていません。URL の情報のみ）'
      : input.snsTexts
          .map(
            (s, i) =>
              `--- 投稿 ${i + 1} (${s.url}) ---\n${s.text.trim() || '（本文なし）'}`
          )
          .join('\n\n')

  const publishHint = input.preferredPublishDate
    ? `\n公開希望日: ${input.preferredPublishDate}（記事の鮮度の参考に。本文には書かない）`
    : ''

  return `${PERSONA}

以下は、地域の方が「Sayo's Journal で紹介してほしい」と寄せてくださった
SNS 投稿の本文（最大 5 件）と種別情報です。
これらを **ひとつのミニ記事（短めの紹介記事）** にまとめ、**JSON 形式のみ** で出力してください。

【重要】
- ミニ記事は無料公開される短い紹介記事です。長文にせず 400〜800 字程度にまとめる
- セクション分割（h2 見出し）は使わず、1 本の流れる文章で書く（段落 <p> のみ。h2/h3 は使わない）
- 提供された SNS 本文の情報のみを使用し、捏造しない
- 複数の投稿がある場合は、共通テーマを軸にひとつの記事へ自然に統合する
- 情報が薄い箇所は無理に膨らませず、必要なら「※ここに追加取材の内容を加筆してください」を挿入
- クレジット表記や元 URL の引用は **入れない**（紗代さんが後で判断するため）
- JSON 以外のテキスト・説明・マークダウンフェンスは絶対に出力しない

【この依頼の種別】
${typeLabel}
→ トーン: ${TYPE_TONE[input.inquiryType]}

【イベント情報の抽出ルール】
本文中に開催日 + 会場 が含まれていればイベントとして扱い、is_event=true、関連フィールドを埋める。
含まれていない（普通の紹介）なら is_event=false で関連フィールドはすべて null。

- event_date_start / event_date_end: ISO 形式 YYYY-MM-DD
  - 単日開催 → start のみ、end は null
  - 複数日開催（例: 3/22-23） → start と end 両方
  - 「来月」「今度の土曜」など相対表記しかない → null（extraction_note に記録）
  - 「毎週土曜」など定期開催 → null + extraction_note にメモ
- event_time_start / event_time_end: 自由記述 ("10:00", "10時〜")
- event_venue: 会場名 / event_address: 住所（あれば）
- event_fee: 料金（"無料", "500円" 等の自由表記）
- event_url: 公式サイトや申込フォームの URL（本文中にあれば）
- extraction_note: 抽出に関する補足（曖昧な日付などの人間レビュー用メモ）

【出力 JSON スキーマ】
{
  "title": "記事タイトル（15〜40字、イベントなら【日付】等の修飾を含めて良い）",
  "excerpt": "記事抜粋（60〜120字）",
  "content_html": "<p>...</p><p>...</p>（Tiptap 互換: p, strong, em, a のみ。h2/h3 は使わない）",
  "recommended_category_slug": "既存カテゴリから1つ（イベントなら 'event' 推奨）",
  "recommended_hashtags": ["タグ1", "タグ2"]（3〜8 個、# なし、日本語可）,
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

【既存カテゴリ一覧】
${categoriesList}

【提供された SNS 投稿】（画像 ${input.imageCount} 枚が記事に添付されます）${publishHint}

${snsBlock}
`
}
