# Ticket 35: Cowork CSV 取り込み（IG 投稿の手動アップロード）

> **フェーズ**: Phase 3B
> **依存**: 29（DB）, 34（sources 管理）
> **ブロック**: 36（取得投稿管理画面）

---

## 概要

外部スクレイピングサービス（Bright Data 等）には依存せず、
**Claude Desktop の Cowork 機能で IG 投稿を取得 → CSV と画像ファイルを管理画面からアップロード**する手動取り込みフローを実装する。

- 紗代さんが取得対象アカウントを `ig_sources` に登録（Ticket 34）
- 管理者（開発者）が Cowork 指示書をダウンロード → Cowork で CSV + 画像取得
- 管理者が `/admin/instagram/imports/upload` で CSV と画像をアップロード
- 取り込み結果は `ig_imported_posts` に保存され、後続 Ticket 36 / 37 で記事化

---

## 実装内容

### 1. 前提・設計方針

- **完全手動運用**: 自動取得・定期取得は実装しない（将来拡張）
- **許可されたアカウントのみ取り込み**（`permission_status = 'approved'` かつ `is_active = true`）
- **重複防止**: `ig_imported_posts.ig_post_id` UNIQUE で同一投稿は ON CONFLICT DO NOTHING
- **画像はアップロード時に Storage 保存**: 取り込み時点で `ig-imported` バケットに保存し、`stored_image_urls` に公開 URL を格納（Ticket 37 で改めてダウンロードする処理は不要）
- **環境変数追加なし**: 外部 API トークン不要

### 2. CSV 仕様

| 列名 | 必須 | 型 | 内容 | 例 |
|------|-----|-----|------|------|
| `post_id` | ✅ | text | IG 投稿 ID（重複判定キー、UNIQUE） | `DGabc123XYZ` |
| `posted_at` | ✅ | text | 投稿日時（ISO 8601 推奨、`YYYY-MM-DD` でも可） | `2026-03-10T14:30:00` |
| `username` | ✅ | text | 投稿者アカウント（@ なし） | `iida_okonomiyaki_4rest` |
| `caption` | ✅ | text | キャプション全文（改行含む、ダブルクォートで囲む） | `"鉄板の上で\nくるっ、じゅわぁ〜✨"` |
| `image_files` | ✅ | text | 画像ファイル名（カンマ区切り、表示順） | `"DGabc123_1.jpg,DGabc123_2.jpg"` |
| `permalink` | 推奨 | text | IG 投稿 URL | `https://www.instagram.com/p/DGabc123XYZ/` |
| `like_count` | 任意 | integer | いいね数 | `42` |
| `comment_count` | 任意 | integer | コメント数 | `5` |

**CSV ルール:**
- 文字コード: UTF-8（BOM なし）
- 改行コード: LF
- 区切り文字: カンマ
- フィールドにカンマ・改行・ダブルクォートが含まれる場合は `"` で囲む
- フィールド内のダブルクォートは `""` にエスケープ
- 1 行目はヘッダー必須（列名の順序は問わない）

### 3. 画像ファイル仕様

**推奨命名**: `{post_id}_{連番}.{拡張子}`（例: `DGabc123_1.jpg`, `DGabc123_2.jpg`）

ただし**強制ではなく**、CSV の `image_files` 列に書かれたファイル名と、
アップロードされたファイル名が**完全一致**していれば取り込み可能。

**サポート形式**: `.jpg`, `.jpeg`, `.png`, `.webp`
**最大ファイルサイズ**: 10MB / 枚（Supabase Storage 制限考慮）

### 4. DB スキーマ変更

`ig_imported_posts` に以下を追加:

```sql
ALTER TABLE ig_imported_posts
  ADD COLUMN comment_count integer,
  ADD COLUMN selected_image_indexes integer[];  -- Ticket 36 で使用
```

`comment_count`: CSV の `comment_count` 列を保存。Null 可。
`selected_image_indexes`: 記事化時にカルーセルから採用する画像のインデックス（0-origin）。
Null = 全画像採用。Ticket 36 の選択 UI で更新される。

`image_urls` カラムは既存のままだが、本フローでは使用しない（Cowork 取り込みでは画像を直接アップロードするため、外部 URL は不要）。Null のまま運用。

### 5. サンプル CSV / Cowork 指示書のダウンロード

#### 5.1 `GET /admin/instagram/imports/sample.csv`

固定内容のサンプル CSV を配信:

```csv
post_id,posted_at,username,caption,image_files,permalink,like_count,comment_count
DGsample001,2026-03-10T14:30:00,iida_okonomiyaki_4rest,"お好み焼4resTさん🔥投稿その2
@iida_okonomiyaki_4rest 

鉄板の上で
くるっ、じゅわぁ〜✨

#飯田グルメ #お好み焼き","DGsample001_1.jpg,DGsample001_2.jpg",https://www.instagram.com/p/DGsample001/,42,3
DGsample002,2026-03-09T10:15:00,iida_okonomiyaki_4rest,"単一画像サンプル","DGsample002_1.jpg",https://www.instagram.com/p/DGsample002/,18,1
```

実装: `src/app/(admin)/admin/instagram/imports/sample.csv/route.ts`（Route Handler、Content-Type: text/csv）

#### 5.2 `GET /admin/instagram/sources/[id]/cowork-prompt.txt`

該当アカウント情報を埋め込んだ Cowork 指示書を生成・配信:

```
以下の Instagram アカウントの最新投稿を CSV と画像で取得してください。

【対象アカウント】@{ig_username}
【取得件数】最新 10 件

【CSV 形式】UTF-8 (BOM なし)、以下の列で出力
post_id,posted_at,username,caption,image_files,permalink,like_count,comment_count

【列の説明】
- post_id: IG 投稿 ID（unique）
- posted_at: 投稿日時 (ISO 8601: YYYY-MM-DDTHH:MM:SS)
- username: アカウント名 (@ なし)
- caption: キャプション全文（改行・絵文字保持、ダブルクォートで囲む）
- image_files: 画像ファイル名（カンマ区切り、表示順）
- permalink: IG 投稿 URL
- like_count: いいね数（数値）
- comment_count: コメント数（数値）

【画像ファイル名】{post_id}_{連番}.{拡張子}
  例: DGabc123_1.jpg, DGabc123_2.jpg

【出力】
- CSV ファイル 1 つ
- 画像ファイルを別フォルダにダウンロード（CSV の image_files 列の値とファイル名を完全一致させる）

【注意】
- caption はダブルクォートで囲み、改行・絵文字は元のまま保持
- 動画投稿・ストーリーは対象外（通常投稿のみ）
- カルーセル投稿は image_files に複数ファイル名をカンマ区切りで列挙
- 画像のダウンロードに失敗した投稿は CSV にも含めないこと
```

実装: `src/app/(admin)/admin/instagram/sources/[id]/cowork-prompt.txt/route.ts`（Route Handler、Content-Type: text/plain）

### 6. アップロード画面: `/admin/instagram/imports/upload`

#### 6.1 UI 構成

```
┌──────────────────────────────────────────────┐
│ 📥 IG 投稿の取り込み                          │
├──────────────────────────────────────────────┤
│ 1. 取得元アカウントを選択                      │
│   [▼ @iida_okonomiyaki_4rest（飯田お好み焼）]  │
│   ※ permission_status='approved' のもののみ表示 │
├──────────────────────────────────────────────┤
│ 2. CSV ファイルをドロップ                      │
│   [📄 posts.csv (3.2 KB)            ]        │
│   ※ 形式: 上記 CSV 仕様参照                    │
│   📥 サンプル CSV をダウンロード               │
├──────────────────────────────────────────────┤
│ 3. 画像ファイルをドロップ（複数 OK）            │
│   [🖼 12 files selected             ]        │
│   - DGabc001_1.jpg (245 KB)                  │
│   - DGabc001_2.jpg (312 KB)                  │
│   - ...                                       │
├──────────────────────────────────────────────┤
│ 📊 プレビュー                                  │
│ ✅ CSV 行数: 5 投稿                            │
│ ✅ 画像ファイル: 12 枚（過不足なし）            │
│ ⚠️ 既存と重複: 1 件（スキップされます）         │
│ ✅ 新規取り込み: 4 件                          │
├──────────────────────────────────────────────┤
│ [キャンセル]              [取り込み実行]       │
└──────────────────────────────────────────────┘
```

#### 6.2 検証フロー（取り込み実行ボタン押下前にプレビュー表示）

クライアント側でファイル選択時に以下を実行:

1. **CSV パース**: `papaparse` を使う（既存依存、`migrate-posts.ts` で利用中）
2. **必須列の検証**: `post_id`, `posted_at`, `username`, `caption`, `image_files` が存在するか
3. **画像ファイル名の照合**:
   - 全 CSV 行の `image_files` を集約
   - アップロード画像の filename と突き合わせ
   - 不足 / 余分があればエラー表示
4. **username の照合**: CSV の `username` 列が、選択した sources の `ig_username` と全て一致するか
5. **重複チェック**: `ig_post_id` で既存 `ig_imported_posts` を検索 → 既存件数を表示

#### 6.3 取り込み実行（Server Action）

`uploadIgImports(formData: FormData)` で以下を順次実行:

1. 認証チェック（`assertAdminAuth`）
2. FormData から CSV テキスト + File[] を取り出す
3. CSV パース + バリデーション（クライアント側と同じロジックをサーバー側でも実行）
4. 各画像ファイルを Supabase Storage にアップロード:
   - パス: `ig-imported/{ig_username}/{post_id}_{N}.{ext}`
   - アップロード失敗（重複等）は upsert: `{ upsert: true }`
   - 公開 URL を取得して post_id ごとに集約
5. 各 CSV 行を `ig_imported_posts` に INSERT（ON CONFLICT (ig_post_id) DO NOTHING）:
   ```typescript
   {
     source_id: <選択した source の ID>,
     ig_post_id: row.post_id,
     caption: row.caption,
     image_urls: null,                   // 使わない
     stored_image_urls: <公開 URL の配列>,
     ig_posted_at: row.posted_at,
     likes_count: row.like_count,
     comment_count: row.comment_count,
     ig_post_url: row.permalink,
     status: 'pending',
   }
   ```
6. `ig_sources.last_fetched_at = now()` を更新
7. 結果を返す: `{ total, inserted, skipped (重複), failed }`
8. `revalidatePath('/admin/instagram/imports')`

### 7. エラーハンドリング

| ケース | 対応 |
|--------|------|
| CSV パースエラー（不正フォーマット） | プレビュー段階で行番号付きエラー表示 |
| 必須列欠如 | エラー表示「post_id 列が見つかりません」 |
| 画像ファイル不足 | 「DGxxx_2.jpg がアップロードされていません」 |
| 余分な画像ファイル | 警告（取り込みは実行可能、不要画像は無視） |
| username 不一致 | 「選択したアカウントと CSV の username が一致しません」 |
| 画像 Storage アップロード失敗 | 1 枚ごとにリトライ 3 回、全失敗ならその post_id をスキップ |
| ファイルサイズ超過（10MB 超） | 該当画像を除外し警告表示 |
| サポート外形式 | 該当画像を除外し警告表示 |

### 8. ファイル構成

```
src/app/(admin)/admin/instagram/imports/upload/
├── page.tsx                                  # アップロード UI
├── actions.ts                                # uploadIgImports Server Action
└── _components/
    ├── UploadClient.tsx                      # ファイル選択 + プレビュー（Client Component）
    ├── CsvPreview.tsx                        # CSV パース結果のプレビューテーブル
    └── ValidationSummary.tsx                 # 検証結果サマリー

src/app/(admin)/admin/instagram/imports/sample.csv/
└── route.ts                                  # GET サンプル CSV 配信

src/app/(admin)/admin/instagram/sources/[id]/cowork-prompt.txt/
└── route.ts                                  # GET Cowork 指示書配信

src/lib/
├── ig-csv-parser.ts                          # CSV パース + バリデーション（共通）
└── ig-import-storage.ts                      # 画像 Storage アップロード処理

supabase/migrations/
└── 20260429_add_ig_imports_columns.sql       # comment_count, selected_image_indexes 追加
```

### 9. 既存 Ticket 34 への接続

Ticket 34 で配置した「📋 Cowork 指示書 DL」ボタンを本チケットで動作させる:
- `CoworkPromptDownloadButton.tsx` のクリック → `/admin/instagram/sources/[id]/cowork-prompt.txt` を `download` 属性付き `<a>` でダウンロード

`/admin/instagram/imports` ページ（一覧、Ticket 36）にも「📥 新規取り込み」ボタンを置き、`/admin/instagram/imports/upload` へ遷移させる。

### 10. 将来拡張（本チケットでは実装しない）

- ZIP まとめアップロード（CSV + 画像を 1 ファイルでアップロード）
- 動画投稿・ストーリーの取り込み
- 自動取得（GitHub Actions / cron 等）
- アップロード履歴 (`ig_import_batches` テーブル) の保持

---

## 完了条件

- [×] `comment_count` / `selected_image_indexes` カラムが `ig_imported_posts` に追加されている
- [×] `/admin/instagram/imports/upload` でアップロード UI が表示される
- [×] 取得元アカウント選択は `permission_status='approved' && is_active=true` のみ表示される
- [×] CSV ファイル選択でクライアント側パース + プレビュー表示が動作する
- [×] 画像ファイル選択（複数）が動作し、ファイル一覧が表示される
- [×] 検証エラー（必須列欠如 / 画像不足 / username 不一致）が UI に明示される
- [×] 重複チェック（既存 ig_post_id との突き合わせ）が動作し件数表示される
- [×] 「取り込み実行」で Server Action が呼ばれ、Storage アップロード + DB INSERT が実行される
- [×] 画像が `ig-imported/{ig_username}/{post_id}_{N}.{ext}` に保存される
- [×] `ig_imported_posts` に `stored_image_urls` 入りで INSERT され、ON CONFLICT で重複は skip される
- [×] `ig_sources.last_fetched_at` が更新される
- [×] `GET /admin/instagram/imports/sample.csv` でサンプル CSV がダウンロードできる
- [×] `GET /admin/instagram/sources/[id]/cowork-prompt.txt` でアカウント別指示書がダウンロードできる
- [×] Ticket 34 の「Cowork 指示書 DL」ボタンが指示書を実際にダウンロードする
- [×] `npm run build` が成功する

> **DB マイグレーション**: `supabase/migrations/20260429045435_add_ig_imports_columns.sql`
> は本実装後、Supabase Studio または MCP 経由で適用すること（動作確認手順 1）。
