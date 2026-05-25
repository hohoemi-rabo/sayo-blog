---
paths:
  - "src/app/(admin)/**"
  - "src/components/admin/**"
  - "src/app/(auth)/**"
  - "src/lib/supabase-browser.ts"
---

# Admin Panel Rules

## Architecture

- Admin routes: `/admin/*` (protected by middleware)
- Auth: `/admin/login/` with cookie-based session
- Layout: Sidebar + Header (一部ページは chromeless 化、後述)
- Supabase client: `supabase-browser.ts` (browser-side singleton)

## Key Components

- `Sidebar.tsx` - Navigation sidebar (Main nav + AI Management section)
- `Header.tsx` - Header with logout button
- `ImageUploader.tsx` - Supabase Storage image upload
- `MediaPickerDialog.tsx` - Media library picker with React Portal
- `editor/RichTextEditor.tsx` - Tiptap rich text editor (dynamic import, SSR-safe)

## AI Management Pages

- `/admin/ai/knowledge` — ナレッジデータ管理 (CRUD + Gemini 一括生成)
- `/admin/ai/tags` — プロンプトタグ管理 (CRUD + AI 一括生成)
- `/admin/ai/analytics` — 利用統計ダッシュボード (統計カード, 日別グラフ, TOP10, 制限管理)

### AI Admin Pattern
- Server Actions (`actions.ts`) for data fetching / mutations
- `_components/` directory for page-specific components
- `createAdminClient()` for DB access
- Cookie-based auth check (`admin_auth`) for API routes

## Instagram Integration Pages (Phase 3)

- `/admin/instagram/posts` — IG 下書き管理 (セクション選択式生成 + CRUD)

> **Ticket 40 で削除**: `sources` / `imports` / `imports/upload` (Cowork CSV 取り込みフロー) は廃止。情報窓口フォーム (下記) に置き換え。

## 情報窓口フォーム — 依頼管理 (Phase 4)

- `/admin/inquiries` — 依頼管理 (force-dynamic, `?tab=mini|long` 切替 + 件数バッジ)
  - ミニ記事 (mini_inquiries) / ロング記事 (long_inquiries) を別タブで一覧表示
  - ミニ (Ticket 41) は実装済み: フィルタ + 詳細ダイアログ (内部メモ編集 / ステータス操作 / 削除) + AI 記事化 (`/admin/inquiries/[id]/generate`)。ロング (Ticket 42) は枠のみ
  - `?open={id}` で該当依頼の詳細ダイアログを自動オープン (メール通知リンク用)
  - Sidebar「依頼管理」に未処理 (pending) 件数の赤バッジ (admin layout が getInquiryCounts で注入)
  - データ取得は `actions.ts` ('use server')、同期ヘルパー (parseInquiryTab / InquiryCounts / InquiryMutationResult) は `filters.ts` に分離
  - ラベル/表示ヘルパーは `src/lib/inquiries.ts` に集約 (Server/Client 両用)

### ミニ記事の画像・依頼の寿命モデル (Ticket 41 — 重要)

画像 (`inquiry-images/mini/{依頼ID}/`) は **依頼 (mini_inquiries) の持ち物**。記事 (posts) は URL を参照するだけ。
いただいた画像を不用意に失わないため、削除は 2 段階:

- **記事 (post) を削除** (`deletePost`) → 画像は**残す**。FK で `generated_post_id` が NULL になり、
  紐づく依頼を **status='pending' に戻す** (再生成可能に)。自由記事のサムネ (`thumbnails`) を消さない既存方針とも一貫。
- **依頼を削除** (`deleteMiniInquiry`) → 行を削除 + `inquiry-images/mini/{id}/` を list→remove で掃除 (確認ダイアログ付き)。

> 補足: 生成記事を削除すると依頼は pending に戻る。`generated_post_id` が後から入ると published 扱い。

## Article Edit / Preview (Ticket 37)

- `/admin/posts/[id]` — 記事編集 (PostForm: タイトル / 本文 / 抜粋 + サイドバーに公開設定 / イベント情報 / サムネ / カテゴリ / ハッシュタグ / IG セクション)
- `/admin/posts/[id]/preview` — 下書きプレビュー (chromeless layout)
  - `is_published` フィルターを無視するので下書きでも公開記事と同じ見た目で確認できる
  - middleware で auth 必須、ヘッダー `x-pathname` を読み取って admin/layout.tsx が Sidebar + Header をスキップ
  - PostForm の「プレビュー」ボタンはこの URL に飛ぶ (公開 URL 直叩きでは下書きが 404 になるため)
  - `EventInfoSection` で is_event チェック + 開催日 + 時刻 + 会場 + 住所 + 料金 + URL を編集可能

### Instagram Admin Pattern
- `'use server'` ファイルは async 関数しか export できないため、同期ヘルパー
  (例: `parseIgPostStatus`) は別ファイル `filters.ts` に分離する
- 認証は `src/lib/admin-auth.ts` の `requireAdminAuth()` (API ルート用 /
  NextResponse 返却) または `assertAdminAuth()` (Server Action 用 / throw) で統一
- mutation は `withRetry()` で Cloudflare 502/503/504 を指数バックオフ自動リトライ
- エラーメッセージは `friendlyDbError()` で HTML レスポンスを「サーバー一時エラー」に整形

## Known Issues

### Tiptap Editor in React 18 StrictMode
**Issue**: Duplicate extension warning
**Solution**: Module-level singleton cache for extensions:
```typescript
const extensionsCache = new Map<string, Extension[]>()
function getExtensions(placeholder: string) {
  if (!extensionsCache.has(placeholder)) {
    extensionsCache.set(placeholder, createBaseExtensions(placeholder))
  }
  return extensionsCache.get(placeholder)!
}
```

### Tiptap BubbleMenu Z-Index
**Issue**: BubbleMenu behind sidebar, cut off at edges
**Solution**: Custom bubble menu using React Portal + Floating UI:
- Portal renders to `document.body` (escapes stacking context)
- `z-index: 9999` above sidebar (z-40)
- Floating UI `shift` + `flip` for viewport awareness

### Dialog Infinite Loop (React Portal Pattern)
**Issue**: MediaPickerDialog rapidly opens/closes in loop
**Solution**: Use `useRef` to prevent duplicate fetches:
```typescript
const hasFetched = useRef(false)
// Reset ref when dialog closes
useEffect(() => { if (!open) hasFetched.current = false }, [open])
```

### Media Usage Check & Safe Image Deletion
- **Post edit page (ImageUploader)**: Only clears URL, does NOT delete from Storage
- **Media management page**: Checks usage before deletion
  - `checkMediaUsage()` checks both `thumbnail_url` AND `content` (記事本文内の画像)
  - Returns `MediaUsageResult` with `details[]` containing per-post usage types
  - Dialog shows each affected post with usage type labels: (サムネイル) / (記事本文)
  - Single delete: shows up to 5 affected posts with usage details
  - Bulk delete: merges usage across all selected files, shows combined details

### Custom Checkbox
Wrap in `<label>` element to make visual checkbox clickable:
```typescript
<label htmlFor={id} className="cursor-pointer">
  <input id={id} type="checkbox" className="sr-only" />
  <div className="checkbox-visual">...</div>
</label>
```

**Layout pattern** — チェックボックスの横に見出しラベル + その下に説明文を
置く場合、`items-start` で並べると ✅ が一行目の上に寄ってズレるので、
チェックボックスとラベルを `items-center` の flex 行で並べ、説明文は
別の段に分離して `pl-7`（checkbox 16px + gap 12px ≈ 28px）で
ラベル開始位置と揃える:

```tsx
<div className="flex items-center gap-3">
  <Checkbox id="x" checked={...} onCheckedChange={...} />
  <label htmlFor="x" className="cursor-pointer text-sm font-medium">
    メインラベル
  </label>
</div>
<p className="mt-2 pl-7 text-xs text-text-secondary">
  補足説明文...
</p>
```

Applied in `AutoGenerateSettings.tsx`.

### Chromeless Admin Pages (Sidebar / Header をスキップ)

`/admin/posts/[id]/preview` のように、admin auth は必要だが Sidebar / Header
を表示したくないページがある場合のパターン:

1. `src/middleware.ts` が `/admin/*` 全リクエストに `x-pathname` ヘッダーを注入
2. `src/app/(admin)/admin/layout.tsx` で `headers()` から `x-pathname` を読み取り、
   `CHROMELESS_PATTERNS` 配列に一致したら `<ToastProvider>{children}</ToastProvider>` のみ返す
3. それ以外は通常通り Sidebar + Header + main で囲む

```tsx
const CHROMELESS_PATTERNS = [/^\/admin\/posts\/[^/]+\/preview(\/|$)/]

export default async function AdminLayout({ children }) {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? ''
  const isChromeless = CHROMELESS_PATTERNS.some((re) => re.test(pathname))
  if (isChromeless) return <ToastProvider>{children}</ToastProvider>
  return /* Sidebar + Header layout */
}
```

新しい chromeless ページを追加する場合は `CHROMELESS_PATTERNS` に regex を追加するだけ。

### Dialog Overflow Pattern (tall content)
Long dialogs (多数のフィールド、画像ピッカー付き編集等) must use a 3-section
flex column layout so action buttons stay visible:

```tsx
<DialogContent className="flex max-h-[90vh] w-[95vw] max-w-2xl flex-col p-0">
  <DialogHeader className="border-b border-border-decorative px-6 py-4">
    ...
  </DialogHeader>
  <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
    {/* form fields */}
  </div>
  <DialogFooter className="border-t border-border-decorative px-6 py-4">
    {/* cancel / save buttons — always visible */}
  </DialogFooter>
</DialogContent>
```

Applied in `IgPostEditDialog.tsx`, `GenerateDialog.tsx`.
