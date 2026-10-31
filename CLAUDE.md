# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.
Detailed rules are split into `.claude/rules/` for context-efficient loading.

## Project Overview

**HOISA** (旧 Sayo's Journal, 2026-10 改名) - A narrative blog site combining "words × photos × experiences" for writer/interviewer Sayo Motooka. Built with Next.js 15 + Supabase + Tailwind CSS.

## Development Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm start           # Start production server
npm run lint        # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 3.4.17
- **Database**: Supabase (PostgreSQL + pgvector)
- **Storage**: Supabase Storage (for images: `thumbnails` / `ig-posts` / `inquiry-images` / `image-variants` = next/image 用の縮小版)
- **Images**: Vercel の画像最適化は不使用 (Hobby の月 5,000 変換超えで 402 になったため)。next/image はカスタムローダー → `/api/img` が縮小版を作って Storage から配る (詳細 frontend.md)
- **AI**: Google Gemini (gemini-3.6-flash + gemini-embedding-2)
- **Language**: TypeScript 5
- **React**: 19.1.0

## Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout (fonts + global metadata)
│   ├── (chat)/              # AI Chat page (公開 Header + main 専用高さ, no Footer)
│   ├── (lp)/                # 独立 LP × 2 (サイト共通 Header/Footer 不使用)。/request/post (投稿記事=mini) と /request/interview (取材記事=long)
│   │                        # ⚠️ 両LPはクラス名が同一・パレットのみ差異。CSS はルート毎 layout で読み .lp-post / .lp-long にスコープ (frontend.md 参照)
│   ├── (public)/            # Public pages (Header + Footer)
│   │   ├── page.tsx         # Home (HOISA Hero + 特集/レポート/ランダム3件 + Pick Up 6 posts)
│   │   ├── blog/page.tsx    # Blog listing ("もっと見る" button)
│   │   ├── [category]/      # Category listing
│   │   ├── [category]/[slug]/ # Article detail
│   │   ├── privacy/         # Privacy Policy
│   │   └── search/          # Search page
│   ├── (admin)/admin/       # Admin panel (CMS + AI + Instagram)
│   ├── (auth)/admin/login/  # Login
│   └── api/                 # API routes
├── components/
│   ├── ui/                  # Base UI components
│   ├── ai/                  # AI Chat components
│   └── admin/               # Admin components (Tiptap editor)
└── lib/                     # Utilities, types, Supabase clients
```

## URL Structure

```
/                              → Home (HOISA ヒーロー + 特集 / レポート / ランダム3件 + Pick Up)
/blog                          → Blog listing ("もっと見る" button)
/blog?category=food            → Category filter
/blog?hashtags=tag1,tag2       → Hashtag filter
/blog?sort=popular             → Sort by view count
/food/                         → Category listing page
/food/[slug]/                  → Article detail
/search?q=keyword              → Search results
/gallery                       → 写真ギャラリー (公開記事の画像を masonry 一覧 → クリックで記事直行)
/chat                          → AI Chat (admin: full chat, user: teaser)
/privacy                       → Privacy Policy
/about                         → About (2026-10-18 改稿: HOISA について 3 章 + 3つの記事のかたち + HOISA の特徴 (システム相談 → Instagram DM) + 運営者 本岡紗代/FUNE は最下部。Contact ページは無く連絡は Instagram = `SITE_CONFIG.instagramUrl`)
/request/post                  → 投稿記事 LP + 情報提供フォーム (公開名「投稿記事」/ 内部コード名 mini)。独立 LP ((lp) ルートグループ, 独自 Header/Footer)。ターゲットは **SNS に投稿している人 + チラシで宣伝している人**。**SNS URL (最大5) か チラシ・写真の添付 (最大2点/画像・PDF) の「どちらか一方」が必須** + BotID + Zod + Gmail SMTP 通知 + FAQ JSON-LD。旧 /request/mini は 301 (next.config.ts redirects)
/request/post/guide            → 投稿記事の切り口診断 (7型)。「業種」ではなく「どの魅力を前に出すか」で分岐し、**送る5投稿の選び方**を示す。結果は `/request/post?angle=...` に引き継がれ mini_inquiries.article_angle に保存。7型の中身は静的 HTML でも出す (JS 内だけだとクロールされないため)。CSS は `/request/post` の layout を継承 = `.lp-post` スコープを共有
/request/post/thanks           → 投稿記事 送信完了画面 (noindex, LP トーン)
/request/interview             → 取材記事 LP + 相談フォーム (公開名「取材記事」/ 内部コード名 long)。独立 LP ((lp) ルートグループ)。プラン3種提示 + 希望プラン選択 (desired_plan) + 種別ごと条件出し分け + BotID + Zod + Gmail SMTP 通知 + FAQ JSON-LD。旧 /request/long は 301 (next.config.ts redirects)
/request/interview/thanks      → 取材記事 送信完了画面 (noindex, LP トーン)
/admin/                        → Admin dashboard
/admin/ai/knowledge            → AI Knowledge management
/admin/ai/tags                 → AI Prompt Tags management
/admin/ai/analytics            → AI Analytics dashboard
/admin/inquiries               → 依頼管理 (ミニ/ロングのタブ切替 + 件数バッジ + 詳細/ステータス操作/削除)
/admin/inquiries/[id]/generate → 投稿記事の AI 記事化 (URL 本文の自動取得 + 依頼者の添付を AI が読む + 取れない URL はスクショ添付 (保存しない) + 補足メモ + 追加画像 → 下書き生成)
/admin/instagram/posts         → IG 下書き管理 (セクション選択式生成 + 編集)
/admin/gallery                 → ギャラリー管理 (画像の表示 ON/OFF + ピン留め, アップロード/削除はしない)
/admin/posts                   → 記事一覧 (出自タブ: 自由記事 / ミニ記事 / ロング記事)
/admin/posts/create            → 新規作成の作り方選択 (3枚カード: チラシから / メモから / 自分で書く)
/admin/posts/craft             → 記事クラフト (?mode=flyer|memo, チラシ画像/PDF vision + メモ → AI下書き生成)
/admin/posts/[id]              → 記事編集 (タイトル + 本文 + イベント情報 + 公開設定)
/admin/posts/[id]/preview      → 下書きプレビュー (chromeless layout, is_published 関係なく表示)
```

**Categories** (flat, 2026-10 再編): food (食・グルメ), event (イベント・講座), outing (おでかけ), culture (文化・歴史), life (暮らし), people (人・活動)。旧 gourmet/spot/news の URL は 301 (一覧は next.config.ts、記事は記事ページでカテゴリ不一致を検出して正規 URL へ)

## Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=https://www.sayo-kotoba.com
ADMIN_PASSWORD=your-secure-admin-password
CRON_SECRET=your-random-secret  # Vercel Cron keepalive 認証用 (openssl rand -hex 32)
NEXT_PUBLIC_GA_MEASUREMENT_ID=  # GA4 (optional, set when available)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash        # default: gemini-3.6-flash
EMBEDDING_MODEL=gemini-embedding-2 # default: gemini-embedding-2
# 情報窓口フォーム メール通知 (Gmail SMTP / Nodemailer)
GMAIL_SMTP_USER=your-gmail-address@gmail.com         # 送信元 Gmail
GMAIL_SMTP_APP_PASSWORD=your-gmail-app-password       # Google アプリパスワード (2段階認証必須)
INQUIRY_NOTIFY_TO=notify-destination@gmail.com        # 通知先 (紗代さんのメール)
```

## Conventions

- Use `@/` path alias for all imports
- Use `PostWithRelations` type (not `Post`) for components needing nested data
- Feature tickets live in `docs/*.md` with numeric prefix (e.g. `29_xxx.md`)

### Todo format in ticket files

Each ticket file (`docs/NN_*.md`) manages its own Todo list under 「完了条件」.
- Unfinished: `- [ ]`
- **Completed: `- [×]`** (full-width ×, NOT `- [x]` or `- [✓]`)
- When a task is finished, immediately update `- [ ]` → `- [×]` in the corresponding ticket
- Do not delete completed items — keep the full history visible

## MCP Setup

Supabase Project: `sayo-blog` (ID: `nkvohswifpmarobyrnbe`, Region: ap-northeast-1)

## Rules Directory

Context-specific rules are loaded based on file paths being worked on:

| File | Loaded when working on | Content |
|------|----------------------|---------|
| `.claude/rules/nextjs-patterns.md` | `src/app/**`, `src/components/**` | Next.js 15 best practices |
| `.claude/rules/frontend.md` | `src/components/**`, `src/app/(public)/**` | Design system, known issues |
| `.claude/rules/admin.md` | `src/app/(admin)/**`, `src/components/admin/**` | Admin panel, Tiptap, Dialog pattern |
| `.claude/rules/database.md` | `src/lib/supabase*`, `src/app/api/**`, `supabase/**` | DB schema, Supabase patterns |
| `.claude/rules/instagram.md` | `src/lib/ig-*`, `src/lib/post-sections*`, `src/app/**/instagram/**` | Blog 執筆ルール, キャプション設計, サニタイザ |
| `.claude/rules/implementation-status.md` | Always | Completed tickets, file map |

## Blog Authoring Rule for Instagram Integration

**IG 投稿する記事は必ず「h2 見出し → 画像 → 文章」のセクション構造で書く。**
1 セクション = 1 IG 投稿にマッピングされる。詳細は `.claude/rules/instagram.md` 参照。

---

**Created**: 2025-11-13
**Updated**: 2026-10-30 (**投稿記事の記事化を「紗代さんは画面を開いてボタンを押すだけ」に近づける** = 無料掲載なので記事化の手間を減らすことが目的。①**依頼者の添付 (チラシ画像・PDF) を AI (vision) が直接読む** (`inquiry-attachment-reader.ts`)。②**記事化画面を開くと URL の中身を自動取得**して貼り付け欄を埋める (`url-text-extractor.ts`, SSRF 対策つき)。Instagram 等のログイン壁・表示後に JS で中身を作るページ (例 machino.club) は取れない → ③**取れなかった URL の下に「スクショを添付」** (Edge の「Web キャプチャ → ページ全体」を想定)。**スクショは保存しない** (紗代さん指定) = ブラウザで 2000px ずつ分割 + JPEG にして生成 API へ直接渡す (Vercel の本文上限 4.5MB 対策)。④補足メモ欄 + チラシだけの依頼 (URL 0 件) も記事化可能に (以前は止まっていた)。⑤**プレビュー 404 の修正**: 記事編集画面の**下の**「プレビュー」が公開 URL に飛んでいた → 管理用プレビューへ。⑥⚠️ **AI 生成記事の slug は日本語** (タイトル由来) で、記事ページは slug をパーセントエンコードのまま検索して**公開しても 404** だった → `decodeURIComponent` してから検索 (既存 96 記事は英字 slug なので表面化していなかった)。⑦**モデル変更**: `gemini-3.6-flash` + `gemini-embedding-2` (preview と GA の埋め込みは同一ベクトル = 知識データ 27 件は作り直し不要。Vercel に GEMINI_MODEL / EMBEDDING_MODEL の設定は無く既定値で動く)。詳細 implementation-status.md「記事化で添付を AI に読ませる」。全部本番反映済み)
**Prev0000**: 2026-10-28 (**LP 2 本 (投稿記事 / 取材記事) + 切り口診断の表示崩れ・文言を総点検**。①取材記事の**プランがスマホでも 3 列のまま** (1 列 ~100px で 1 文字ずつ縦並び) → `lp-long.css` はプロトタイプの重ね書きで、後ろの層の `.planwrap{repeat(3,1fr)}` が 980px のメディアクエリを打ち消していた。**レスポンシブ補正は `lp-long.css` 末尾に集める**。②**両 LP のバナー見出しが黒文字** (globals.css の `h1〜h6{color}` が白の継承を潰す)。③**相談フォームの内側の枠 (`.lp-form-card`) を廃止**し CTA 枠に直接置く + フォーム文字を 1〜2px 拡大 (入力欄 16px = iOS のフォーカス時ズーム回避)。`.cta-box p` を `> p` に (フォーム内のヒントまで中央寄せ + 余白 26px になっていた)。④**旧名「Sayo’s Journal」が 5 か所残存** (曲がった `’` で改名の置換を逃れていた) → `SITE_CONFIG.name` に。⑤文言: 掲載方法の「カレンダー」→「カレンダー（準備中）」、企業向けの「相談窓口」→「Instagram の DM」(About と同じ)。⑥見出しは文節折り返し (`word-break: auto-phrase` + `text-wrap: pretty`, Safari は前者非対応)・PC のプラン価格の高さ揃え・フッターリンクのタップ高 44px。詳細 frontend.md「独立 LP」。全部本番反映済み)
**Prev000**: 2026-10-19 (①**画像が出ない障害の対応**: Vercel Hobby の画像最適化 (月 5,000 変換) を使い切り、未キャッシュの画像が 402 で表示されなくなった → **next/image をカスタムローダーに切り替え、`/api/img` が初回表示時に sharp で縮小版 (WebP q75, 400/800/1200px) を作って Supabase の `image-variants` に保存して配る**。1920px は**ストレージ優先で作らないと紗代さんと合意** (高精細 PC の大きい写真は少し甘くなる。戻すなら `VARIANT_WIDTHS` に足すだけ)。migration `20261019120000`。②**トップのランダム枠** (2026-10-15): 「まちのお知らせ」を見出しごと廃止 → 終了イベントを除く全カテゴリからランダム 3 件 + 「もっと見る」(/blog)。**トップの ISR は 3600s** (10 分では入れ替わりすぎた)。③**About 改稿** (2026-10-18): 紗代さんの原稿で HOISA の説明中心に再構成、プロフィールは最下部。Contact ページは無く、相談は Instagram DM (`SITE_CONFIG.instagramUrl`)。④⚠️ デプロイが **Google Fonts (Noto Serif JP) の一時的な応答不良でビルド失敗**したことがある (`Cannot read properties of null (reading '1')` in `@next/font/google/loader.js`)。コード起因ではなく Redeploy で通った。繰り返すなら Noto もサブセットの local font 化を検討。全部本番反映済み)
**Prev00**: 2026-10-14 (**HOISA ブランド化 + カテゴリ再編** = Ticket 44 `docs/44_hoisa-top-redesign.md`。①**カテゴリ 6 本に再編** (food/event/outing/culture/life/people。旧 gourmet/spot/news の URL は 301、記事は記事ページでカテゴリ不一致を検出して正規 URL へ。migration `20261014120000`)。②**サイト名 HOISA** (キャッチ「飯田下伊那のあれこれを、運ぶ。」= `SITE_CONFIG.tagline`)。③**ヘッダー刷新** (プルダウン: 記事を読む / 探す / AI で探す(近日公開) / 情報を届ける=投稿・取材の 2 択。カテゴリは DB から)。④**トップのヒーロー + 3 枠** (特集 / レポート / まちのお知らせ。`src/lib/home-posts.ts` が枠ごとの記事を決め Pick Up との重複を除く。「AI要約で読む」→ 記事の `?summary=…#ai-summary`)。⑤**フッター刷新**。⚠️ **和文の飾りフォント (font-mincho / font-hand) は固定文言専用のサブセット** — 可変テキストに使うと文字が欠けて Noto にフォールバックする。文言を変えたら `npm run fonts:subset`。⑥本番に `NEXT_PUBLIC_SITE_URL` を設定 (canonical/sitemap が vercel.app になっていた)。ヒーロー写真・ロゴは仮 (素材待ち)。⑦**記事ページの右目次は 1440px から** (1280px から出していたら 15 インチのノート PC で本文・画像に重なった。詳細 frontend.md)。全部本番反映済み)
①**チラシ対応**: `sns_urls` の必須を外し、**SNS URL (最大5) か 添付 (最大2点) の「どちらか一方」が必須**に (Zod `superRefine`、DB 制約ではない)。公開フォームの添付は **PDF 可** (`INQUIRY_ATTACHMENT_ACCEPT`)。管理の「追加画像」は記事本文に `<img>` で差し込むので**画像のみ据え置き** (`INQUIRY_IMAGE_ACCEPT`)。画像と PDF は同じ `image_urls` に混在し `isPdfAttachment()` で振り分け (記事生成では PDF を除外)。
②**切り口診断 `/request/post/guide`** (プロトタイプ `index_SNS5web_2.html` 由来): 質問5 → 7型。**LP ではなく `/request/post` の下位ページ**なので `.lp-post` スコープと `lp-post.css` を継承 = 新 CSS スコープを作らない。7型は**静的 HTML でも描画** (JS 内だけだとクロールされない)。結果は `?angle=` でフォームへ運び `mini_inquiries.article_angle` に保存 (migration `20260711120000`, NULL 許容 + CHECK 7値) → 通知メール/管理詳細/記事化画面に表示。`MiniLpForm` の `useSearchParams` は **Suspense 必須** (外すと `/request/post` が動的に落ちる)。
③⚠️ **診断結果のコピーは「〜を書く」ではなく「〜の投稿を選ぶ」トーンで**。フォームに自由記述欄は無く、受け取るのは URL かチラシ。プロトタイプはここを間違えていた。
④**紗代さん向けドキュメント**: `docs/lp-structure.md` (親子関係の説明 = **親 LP は作らない / トップと About がその役割**) と `docs/business-lp-questions.md` (ビジネス LP の打ち合わせ議題。**デモが見せている「カレンダー」は未実装・「AI 検索」は管理者専用**という宿題つき))
**Prev0**: 2026-07-11 (**投稿記事の窓口を「SNS の人 + チラシの人」の 2 ターゲットに開く + 切り口診断を新設**。
**Prev**: 2026-07-08d (**取材記事の URL を改名**: `/request/long` → **`/request/interview`** (公開名「取材記事」に合わせる)。旧URL・旧thanks は next.config.ts で **301**。投稿記事 (`/request/mini`→`/request/post`) と同じ方針で **公開 URL・表示名だけ変更し、内部コード名 (`long_inquiries` / `LongInquiry` / `article_type='long'` / `LongLpForm` / 管理画面ラベル) は `long` のまま**。ヘッダー/About/投稿記事LPフッター/sitemap/BotID 保護パス/canonical/OG を更新)
**Prev2**: 2026-07-08c (**取材記事 LP 化**: `/request/long` (当時) を `index_long.html` 忠実再現の独立 LP に置き換え ((public)→(lp) へ移設)。①**CSS スコープ設計を刷新** — 両 LP はクラス名が同一でパレットのみ差異のため、`(lp)/layout.tsx` からの CSS import をやめ、ルート毎 layout で `lp-post.css`(`.lp-post`) / `lp-long.css`(`.lp-long`) を読む形に。旧 `lp-mini.css`/`.lp-root` は改名。②**希望プラン欄を新設** (migration `20260708120000`, `long_inquiries.desired_plan` = monitor/standard/deep/undecided + CHECK)。フォーム選択 + 通知メール + 管理詳細に表示。③**公開名「取材記事」で統一** (About の「ロング記事」を修正)。④sitemap に /request/long 追加、未使用 ComingSoon.tsx 削除。⚠️ `index_long.html` はテーマ4層の重ね書きファイルで、完成形はカスケード結果 = 層を統合せず定義順を保持。詳細は `.claude/rules/frontend.md`)
**Prev3**: 2026-07-08 (**公開名「投稿記事」で確定** = 旧「ミニ記事/無料記事」。①URL を `/request/mini` → `/request/post` に移設 (next.config.ts で旧URL・旧thanks を 301)。公開表示の「ミニ記事」→「投稿記事」(`ArticleTypeBadge` / About / LP)。②LP 本文の「無料」を 18箇所 → 5箇所に整理: 「無料記事」という**名称としての使用は全廃**し「投稿記事」に統一、「無料」は訴求として効く所だけ残す (ヒーロー主コピー / 「なんで無料で掲載できるの？」見出し + 同本文 / フォーム送信欄の注記。metadata・OG description は SEO 用に温存で本文非表示)。③**内部コード名 (mini_inquiries / MiniInquiry / article_type='mini' / 管理画面ラベル / mini-article-* 等) は mini のまま** = ユーザー不可視のため改名せず大改修を回避)
**Prev4**: 2026-07-07c (記事の読み方 UX: ①要約カード下部に本文への橋渡し案内 (`SummarySlider` 内, 要約があるときだけ表示)。②本文を「続きを読む」で折りたたみ = `src/components/ExpandableArticleBody.tsx` (全文は SSR HTML のまま = SEO 安全, CSS で冒頭クランプ + フェード, 短文は実測して非折りたたみ, TOC は `EXPAND_EVENT` で自動展開)。あわせてミニフォームの種別「その他」に近所話ガイド + 補足欄を 200字 textarea 化。詳細は `.claude/rules/implementation-status.md`)
**Prev5**: 2026-07-07b (ミニ記事フォームの「伝えたいこと」自由記述欄を廃止。ターゲット=「SNS に投稿している人」に絞り、**SNS URL を必須(最低1件)に戻し** message カラムを DROP (migration `20260707120000_drop_mini_inquiries_message.sql`, テーブル 0 行のため無損失)。フォーム/Zod/actions/types/管理画面表示/LP コピー(「URL がなくても大丈夫」→「SNS 投稿の URL を送るだけで大丈夫」)を同期)
**Project Status**: Phase 1 + Phase 2 complete / Phase 3 (29-32, 37 done; 34-36 廃止; 33 保留; 38-39 pending) / Phase 4 情報窓口フォーム complete (40-42 done) / 画像ギャラリー complete / 記事クラフト complete (Ticket 43) / AI 3段階要約 complete / AI Chat UI 仕上げ済み (機能は安定運用中) / 投稿記事の窓口をチラシ対応 + 切り口診断 complete (2026-07-11) / HOISA ブランド化 + トップ刷新 complete (Ticket 44, 2026-10-14) / About 改稿 (2026-10-18) / 画像の自前縮小 = Vercel 画像最適化の置き換え (2026-10-19)

**Next**: ①**HOISA の素材差し替え** (紗代さん待ち: 風景写真 = `HeroSection.tsx` の `HERO_PHOTO` / 正式ロゴ = `HoisaLogo.tsx` / OG 画像 / favicon)。②**イベントカレンダー** (未着手・紗代さんと要件を詰めてから。飯田市はイベント情報がまとまった場所が無い → **サイトの柱になる機能**。`posts` の `is_event` + イベント9カラムはあるが**開催日は全記事未入力** = トップの「まちのお知らせ」枠は 2026-10-15 に見出しごと廃止し、終了イベントを除くランダム 3 件に変更済み)。③**ビジネス向け LP** (`/business` 予定。新フォーム = `business_inquiries` が必要。カレンダーの扱いが決まらないと出せない。議題は `docs/business-lp-questions.md`)。④**Noto Serif/Sans JP の @font-face CSS (各 ~280KB, 全ページ描画ブロック) の削減** (改修前からの技術的負債。ウェイト削減かサブセット化)。⑤AI チャットの一般公開 (今は「近日公開」表示。**知識データが 27 件 / 記事 96 件超**なので公開前に全記事ぶん作る)。⑥⚠️ **管理画面の認証が弱い**: middleware / `admin-auth.ts` は cookie `admin_auth` が固定文字列 `authenticated` かを見るだけ = 知っていればパスワード無しで入れる (2026-10-30 に気づいた既存の問題。Ticket 38 の NextAuth 移行で解消予定。急ぐならログイン時に署名付きトークンを発行する形に)
