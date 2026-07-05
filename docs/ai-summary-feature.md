# AI要約機能（3段階要約 + セグメントスライダーUI）— sayo-blog 実装仕様

長文記事に対して Gemini で「さくっと / ほどよく / じっくり」の3段階要約を生成し、
記事詳細ページでセグメント型スライダー（選択中の背景が横スライドするアニメ付き）で切り替え表示する機能。

元は別プロジェクト（iida-civic-plaza のインタビュー機能）で稼働していた汎用移植プロンプトを、
**この sayo-blog（Next.js 15 App Router + Supabase + Gemini）の実体に合わせて具体化**したもの。
Claude Code にそのまま渡して実装できる粒度で書いてある。

UIの見た目:
- 公開側 = 3分割セグメント（ピル）を選ぶと、選択中の背景が横にスライドする（**CSS transform、framer-motion は使わない**）
- 管理側 = 生成中はボタンに `Loader2`（lucide-react）の回転スピナー

---

## このプロジェクト固有の前提（重要な意思決定）

移植元プロンプトからの変更点。**汎用版のまま実装しないこと。**

| 項目 | 汎用版の指示 | sayo-blog での実装 |
|---|---|---|
| **対象テーブル** | 本文カラムを持つ表を選ぶ | `posts`。本文カラムは `content`（Tiptap の HTML）。プロンプト投入前に HTML 除去が必要 |
| **Gemini クライアント** | `src/lib/gemini.ts` を新規作成 | **新規作成しない**。既存 `src/lib/gemini.ts` の `getGenerativeModel()` を再利用する |
| **モデル名** | `gemini-3.1-flash-lite` を定数で | **使わない**。既存の env `GEMINI_MODEL`（既定 `gemini-3-flash-preview`）に従う。新しいモデル定数を増やさない |
| **アニメ** | framer-motion の `layoutId` | **framer-motion は導入しない**。このプロジェクトは CSS アニメで統一（`ScrollProgress` の scaleX、`animate-slide-in-up` 等）。ピルの背景スライドは `transform: translateX()` + CSS transition で実装 |
| **依存追加** | @google/generative-ai / lucide-react を追加 | **両方導入済み**。追加不要 |
| **環境変数** | GEMINI_API_KEY を新規登録 | **既に本番・ローカルとも設定済み**（AI Chat / 記事クラフトで使用中）。追加作業なし |

---

## 実装ステップ

### 1. DB マイグレーション（← ここは必須。DB を触る）

`posts` に TEXT・NULL許可で3カラムを追加する。既存レコードは要約 NULL ＝ 公開側で自動非表示になる設計。

`supabase/migrations/<timestamp>_add_posts_summary.sql`（既存の命名規則 `YYYYMMDDHHMMSS_*.sql` に合わせる）:

```sql
-- posts に3段階AI要約カラムを追加（すべて NULL 許可・既存記事は要約なし）
alter table posts add column if not exists summary_short  text;
alter table posts add column if not exists summary_medium text;
alter table posts add column if not exists summary_long   text;

comment on column posts.summary_short  is 'AI要約（さくっと / 〜150字目安）';
comment on column posts.summary_medium is 'AI要約（ほどよく / 〜400字目安）';
comment on column posts.summary_long   is 'AI要約（じっくり / 〜800字目安）';
```

- ローカル→本番反映は `supabase db push`（または Supabase MCP `apply_migration`）。
- 全カラム NULL 許可なので既存 96 記事への影響なし・バックフィル不要。
- 詳細ページは `select('*')` で取得しているため、**取得クエリの変更は不要**（カラムが自動的に乗る）。

### 2. 型追加

- `src/lib/types.ts` の `Post` interface に追加:
  ```ts
  summary_short?: string | null
  summary_medium?: string | null
  summary_long?: string | null
  ```
- `src/app/(admin)/admin/posts/actions.ts` の `PostFormData` に同じ3フィールドを追加。

### 3. lib: 要約生成（`src/lib/summary-generator.ts` を新規作成）

**gemini.ts は触らず**、既存 `getGenerativeModel()` を import して使う。

- `export type SummaryLevel = 'short' | 'medium' | 'long'`
- 各レベルの設定をオブジェクトで1箇所に持つ（ラベル / 文字数上限文言 / 改行ルール / 読了時間）:
  - `short`「さくっと」: 150字以内（絶対200字超えない）/ 改行なし1段落 / 約30秒
  - `medium`「ほどよく」: 400字以内（絶対500字超えない）/ 話題の変わり目で空行・2段落 / 約1分
  - `long`「じっくり」: 800字以内（絶対1000字超えない）/ 話題ごとに空行・2〜3段落 / 約3分
- 本文は必ず `content.replace(/<[^>]*>/g, '')` で HTML を除去してからプロンプトに渡す（Tiptap HTML のため）。
- 関数を2つ export:
  - `generateSingleSummary(body: string, level: SummaryLevel): Promise<string>` — 指定1レベルを生成。
  - `generateSummaries(body: string): Promise<{ short: string; medium: string; long: string }>` — 3レベル一括。
- 一括版はパースしやすい区切りで出力させる:
  ```
  ===さくっと===
  （短い要約）
  ===ほどよく===
  （中程度の要約）
  ===じっくり===
  （長めの要約）
  ===終わり===
  ```
  レスポンスを正規表現でパースし、取れなければ空文字にフォールバック。
- プロンプト方針: 紗代さん記事の親しみやすい普通の文章、箇条書き/見出し/HTML禁止、文字数厳守、
  指定の改行ルール厳守、要約本文のみ出力（前置き不要）。
- API 失敗時は `console.error` で記録し、日本語メッセージで throw（握りつぶさない）。
- 呼び出しは既存 `article-ai-shared.ts` のリトライ（`withRetry` 相当）に倣うと堅い。429 対策として一括版を基本にする。

### 4. Server Actions（`posts/actions.ts` は既に `'use server'`）

同ファイルに追加:
- `generateAISummaries(body: string)`: 一括生成。返り値 `{ success, summaries?, error? }`。
  body 空なら `success:false`。3つとも空なら失敗扱い。
- `generateAISingleSummary(body: string, level: SummaryLevel)`: 個別生成。返り値 `{ success, summary?, error? }`。
- 保存は既存 `createPost` / `updatePost` の insert/update オブジェクトに
  `summary_short: data.summary_short ?? null` の3行を足すだけ（フォームから受け取って保存）。

### 5. 管理フォームUI（`_components/PostForm.tsx`）

`EventInfoSection.tsx` と同じ「セクション分割」パターンで、新規に
`_components/SummarySection.tsx`（Client）を切り出して `PostForm` から使うと既存構成に馴染む。

- state: `summaryShort/Medium/Long`（初期値は既存レコード値）、`isGenerating`（一括中）、
  `generatingLevel`（個別中のレベル or null）、`generateError`。
- 「AIで生成」ボタン: 本文が空なら `disabled`。押すと `isGenerating=true` → `generateAISummaries(content)`
  → 成功で3 state 更新、失敗で `generateError` 表示 → `finally` で false。
  生成中は `Loader2` の回転スピナー + 「生成中...」。
- 各レベルに `<textarea>` + 右上「再生成」ボタン + 下に「{length}文字」カウンター。
  再生成中は該当レベルのみスピナー。他レベルのボタンは `generatingLevel !== null` の間 `disabled`。
- 送信は PostForm の既存 formData 経路に summary_short/medium/long を載せる
  （`FormData.set` か hidden input）。`PostFormData` へマッピングして actions に渡す。

### 6. 公開UI: `SummarySlider`（`src/components/SummarySlider.tsx`・Client Component）

- props: `summaryShort`, `summaryMedium`, `summaryLong`（`string | null`）。
- `levels = [{key:'short',label:'さくっと',time:'約30秒'}, {key:'medium',label:'ほどよく',time:'約1分'}, {key:'long',label:'じっくり',time:'約3分'}]`。
- 値が入っているレベルだけ表示。全部空なら `return null`（UIごと非表示）。
- 見出し: `Sparkles`（lucide-react）+「AI要約」。
- **セグメントスライダー（CSS のみ・framer-motion 不使用）**:
  - `rounded-full` の muted 背景に、表示するレベル数ぶんの `<button>` を等幅（`flex-1`）で横並び。
  - スライドする背景は絶対配置の1枚 `<span>`。幅 = `calc(100% / 表示数)`、
    `transform: translateX(選択index* 100%)`、`transition-transform duration-300 ease-out` で横スライド。
    背景色は primary 系。ラベルは `relative z-10` で背景の上に出す。
  - 選択中ボタンの文字色を反転（primary の上で読める色）に。
- 選択レベルの読了時間を `Clock`（lucide-react）付きで「約○○で読める」表示。
- 本文切替のフェードは framer-motion の AnimatePresence を使わず、
  `key={selectedLevel}` で要素を作り直し + `animate-slide-in-up`（既存 Tailwind アニメ）で軽くフェードイン。
  本文は `whitespace-pre-line` で空行（改行）を反映。
- 配置: `src/app/(public)/[category]/[slug]/page.tsx` の
  `<ArticleBody content={processedHtml} />`（現在 229 行目付近）の**直前**、`max-w-4xl` 本文コンテナ内に置く。
  ```tsx
  <SummarySlider
    summaryShort={post.summary_short ?? null}
    summaryMedium={post.summary_medium ?? null}
    summaryLong={post.summary_long ?? null}
  />
  <ArticleBody content={processedHtml} />
  ```
  （右 `aside` の固定 TOC は幅 56 と狭いのでサイドバーには置かず、本文最上部に出す。）
- 詳細ページは ISR `revalidate = 3600`。要約を編集しても反映は最大1時間後（既存挙動どおり）。

### 7. 仕上げ

- `npm run lint` と型チェック（`npm run build` か tsc）を通す。
- CLAUDE.md /（あれば SPEC）に「記事詳細の AI 3段階要約」機能を1行追記。
  環境変数・モデルは既存（`GEMINI_API_KEY` / `GEMINI_MODEL`）を流用するので新規追記は不要。
- `.claude/rules/implementation-status.md` の Key File Map に
  `summary-generator.ts` / `SummarySlider.tsx` / `SummarySection.tsx` を追記。
- Conventional Commits（`feat(posts): ...`）でコミット。個人開発なので main 直コミットで可。

---

## 実装後に手動で確認すること

- 管理画面（`/admin/posts/[id]`）で本文のある記事を開き「AIで生成」→ 3段階が出るか。
  文字数超過があれば textarea で手直しして保存。
- 各レベルの「再生成」が個別に効くか（他レベルがロックされるか）。
- 公開記事ページでスライダー切替と背景スライド／フェードが動くか（要約 NULL の記事では UI ごと出ないか）。
- スマホ幅でピルが崩れないか。

---

## 移植/実装時の注意

- `posts.content` は Tiptap の HTML。要約プロンプト前の HTML 除去は必須。
- 要約カラムは全て NULL 許可。既存記事＝要約なし＝公開側で自動非表示、が前提設計。
- ピルの背景スライドは CSS transform。同一ページに複数スライダーを置く予定は無いので id 衝突の心配なし。
- 文字数制限はプロンプトで「厳守」と書いても超えることがあるため、
  管理画面の手動編集導線（textarea + カウンター）は必ず残す。
- 429（レート超過）で失敗する場合は一括版のリトライ間隔を空ける。モデル変更は env `GEMINI_MODEL` で1箇所。
- SDK は既存の `@google/generative-ai`（`getGenerativeModel()` 経由）に統一。`@google/genai` へは移行しない。
