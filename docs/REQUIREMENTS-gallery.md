# REQUIREMENTS.md — 画像ギャラリー機能（Photo Gallery）

**プロジェクト**: Sayo's Journal
**対象機能**: 画像ファースト導線（写真ギャラリー → 記事）
**作成日**: 2026-06-21
**ステータス**: Draft（実装前 / 要レビュー）
**前提仕様**: `SPEC-FULL.md`（Phase 1/2/4 完了, Phase 3 一部）

> この機能は「テキストから入る導線（ブログ一覧 / 検索 / AI Chat）」に対して、
> **紗代さんがこだわって撮った写真そのものから記事に入る導線**を一本追加する。

---

## 0. 確定済みの方針（依頼者と合意）

| 論点 | 決定 |
|------|------|
| ギャラリーに出す写真の範囲 | **本文画像も全部**（サムネ + `<figure>` 内画像すべて） |
| 写真クリック時の挙動 | **そのまま記事ページ（`/{category}/{slug}`）へ直行** |

## 0.1 仮置き中の判断（レビューで確定したい）

| # | 仮の決定 | 代替案 |
|---|----------|--------|
| 1 | 公開ルートは `/gallery` | `/photos`, `/album` |
| 2 | 管理は新規 `/admin/gallery`（`/admin/media` とは分離） | `/admin/media` に統合 |
| 3 | 初期並び順 = ピン留め → 記事の新着 → 記事内の位置 | ランダム / 完全手動 |
| 4 | ✅確定: `post-sections.ts` と同じ**正規表現ベース**で新規ヘルパーを書く（`parsePostSections` は流用しない / 理由は §3.1） | — |
| 5 | ✅確定: キャプションは `<figure>` 内 `<figcaption>` を採用、無ければ `alt` → 無し | — |

---

## 1. 機能概要

- 公開ページ `/gallery` で、公開済み記事に含まれる画像を一覧表示する。
- 画像タイルをクリックすると、その画像が載っている記事ページへ遷移する。
- 管理画面 `/admin/gallery` で、各画像の「公開ギャラリーへの表示 ON/OFF」と「ピン留め（優先表示）」だけを操作できる。
- 画像と記事の対応は新規テーブル `post_images` で持つ（本文HTMLから抽出・同期）。

---

## 2. データモデル

### 2.1 新規テーブル `post_images`

| カラム | 型 | 制約 / default | 説明 |
|--------|------|----------------|------|
| id | uuid | PK, gen_random_uuid() | |
| post_id | uuid | FK posts(id) ON DELETE CASCADE | 所属記事 |
| image_url | text | NOT NULL | 画像URL（thumbnails バケット） |
| caption | text | nullable | figcaption（あれば） |
| alt | text | nullable | alt 属性（あれば） |
| position | integer | default 0 | 記事内の出現順（サムネは -1） |
| is_thumbnail | boolean | default false | 記事サムネ由来か |
| is_visible | boolean | default true | 公開ギャラリーに出すか（管理者トグル） |
| is_featured | boolean | default false | ピン留め優先表示（管理者トグル） |
| post_is_published | boolean | default false | **記事の公開状態（非正規化）** |
| post_published_at | timestamptz | nullable | **記事の公開日時（非正規化, 並び順用）** |
| created_at / updated_at | timestamptz | default now() | |

- **UNIQUE(post_id, image_url)** … 再抽出時の重複行を防止（upsert キー）。
- `post_is_published` / `post_published_at` を**非正規化**するのは、RLS とギャラリー取得を `posts` への結合なしでフラットに済ませ、部分インデックスを効かせるため（既存の `idx_posts_*_partial` と同じ思想）。

### 2.2 外部キー & CASCADE

| テーブル | カラム | 参照先 | ON DELETE |
|---------|--------|--------|-----------|
| post_images | post_id | posts.id | CASCADE |

→ 記事削除で画像行も自動削除。

### 2.3 RLS（既存 14 テーブルの方針に合わせる）

- **匿名 SELECT**: `post_is_published = true AND is_visible = true`
- **authenticated**: ALL（`(select auth.role()) = 'authenticated'`）

### 2.4 インデックス

- `idx_post_images_gallery_partial` … `(is_featured DESC, post_published_at DESC, position ASC)` **WHERE** `post_is_published AND is_visible`
- `idx_post_images_post_id` … FK 用
- UNIQUE(post_id, image_url)（上記）

---

## 3. 抽出・同期ロジック

### 3.1 抽出ヘルパー `src/lib/post-images.ts`

**設計規約**: `post-sections.ts` に合わせ、**DOMパーサ不使用・正規表現のみ**で実装する（edge/Server Actions で動く isomorphic ライブラリを維持。新規依存を入れない）。`parsePostSections` は流用しない（理由は下記）。`stripTags` / HTMLエンティティ復号などの小ヘルパーは `post-sections.ts` と共通化 or 同等実装を併置。

> **`parsePostSections` を流用しない理由**
> 1. `extractFirstImageUrl` は各セクションの**先頭1枚しか取らない**（ギャラリーは全画像が必要）。
> 2. **figcaption を画像と対応づけない**（`htmlToPlainText` がテキストに溶かすだけ）。
> 3. 最初の `<h2>` より**前の画像を捨てる**（リード画像 / 「画像→見出し」の逆順を取りこぼす）。

- `extractPostImages(post): ExtractedImage[]`（**純粋関数 / DB 触らない**）
  - **content 全体を走査**する（セクション単位ではない）。これにより、`<h2>` 前のリード画像や「画像→見出し」逆順の画像も取りこぼさない。
  - 1 件目: `post.thumbnail_url` があれば `is_thumbnail=true, position=-1`。
  - 本文画像の抽出アルゴリズム（すべて正規表現）:
    1. `<figure>…</figure>` ブロックを global match。各ブロックから `<img src>` / `<img alt>` / `<figcaption>` テキストを取り出し、`caption` に figcaption を入れる（マッチ位置 `matchIndex` を保持）。
    2. figure ブロックを除いた残りから、`<figure>` の外にある裸の `<img>` を抽出（`caption=null`, `alt` のみ, `matchIndex` 保持）。
    3. 1 と 2 を `matchIndex` 昇順にマージ → 出現順が `position`（0,1,2,…）。
  - `image_url` / `alt` 内の **HTMLエンティティを復号**（`&amp;`→`&` 等）してから格納（URLにクエリが付くケースの保険。`extractFirstImageUrl` 同様に復号していない既存実装の轍を踏まない）。
  - 同一 `image_url` が記事内で重複したら最初の 1 件に寄せる（UNIQUE(post_id, image_url) の前段で dedup）。
- `syncPostImages(postId)`:
  1. 対象記事を取得。
  2. `extractPostImages` で現在の画像集合を算出。
  3. `post_images` の当該 post_id 行を **delete → insert**（差分管理が必要になったら upsert に変更）。
  4. `post_is_published` / `post_published_at` を記事の現状で埋める。

### 3.2 同期トリガ（どこで呼ぶか）

- **記事保存時**: 既存の記事保存 Server Action（PostForm の保存処理）で `content` 書き込み後に `syncPostImages(postId)` を呼ぶ。
- **公開トグル時**: `is_published` を切り替える箇所で、当該記事の `post_images.post_is_published` を一括更新（または `syncPostImages` を再実行）。
- **AI 記事化（ミニ記事）経由の保存**でも、最終的に記事保存 Action を通るなら自動で同期される想定。通らない経路があれば明示的に呼ぶ。
- ※ HTML パースが必要なため **DB トリガではなくアプリ層（Server Action）で同期**する。

### 3.3 既存データの backfill

- 一度きりのスクリプト `scripts/backfill-post-images.ts`（または管理用 Server Action）で
  全 posts（約96件）を走査し `syncPostImages` 相当を実行。
- 実行は手動 1 回。冪等（再実行しても重複しない）であること。

---

## 4. 公開ギャラリー `/gallery`

### 4.1 ルーティング / レンダリング

- `src/app/(public)/gallery/page.tsx` — `(public)` レイアウト配下（Header/Footer 付き）。
- 初期表示は Server Component で先頭ページ（例 30 件）を取得。

### 4.2 データ取得 — RPC `get_gallery_images(p_limit, p_offset)`

- N+1 と RLS 結合の煩雑さを避けるため **RPC（SECURITY DEFINER）** で
  `post_images` ⨝ `posts` ⨝（主カテゴリ）を結合し、リンク生成に必要な最小列を返す:
  - `image_url`, `caption`, `alt`, `is_featured`, `post_published_at`
  - リンク用: `slug`, `category_slug`, `title`
- 返却は **公開済み & 表示ON のみ**（SECURITY DEFINER 内で WHERE 固定）。
- 並び順: `is_featured DESC, post_published_at DESC, position ASC`。
- リンク文字列の組み立ては既存 `article-utils`（記事URL生成）と整合させる。

### 4.3 UI

- `_components/InfiniteImageGrid.tsx`（既存 `InfinitePostGrid` を踏襲）
  - masonry グリッド（CSS columns ベース、framer-motion 不使用＝既存方針）。
  - 各タイルは `<a href="/{category}/{slug}">`。**画像クリックで記事へ直行**（ライトボックス無し）。
  - ホバー時オーバーレイ: 記事タイトル＋キャプション（任意）。
  - 画像は遅延読み込み（`loading="lazy"` もしくは `next/image`、グリッド用に縮小配信）。
  - 「もっと見る」ボタンで追加読込（既存パターン流用）。

### 4.4 追加読込 API

- `GET /api/gallery?offset=...&limit=...` で RPC をラップして JSON 返却（既存 `/api/posts` と同形）。

### 4.5 導線

- ヘッダー / フッターのナビゲーションに「ギャラリー」リンクを追加。

---

## 5. 管理画面 `/admin/gallery`

> **役割**: 公開ギャラリーの「見せ方」だけを整える。アップロードや削除はしない。

### 5.1 ルーティング

- `src/app/(admin)/admin/gallery/page.tsx`（`(admin)` レイアウト, noindex）。
- Sidebar にメニュー項目「ギャラリー」を追加。

### 5.2 機能

- 全 `post_images`（**非公開記事の画像も含む**, バッジで状態表示）をグリッド表示。
- 各画像カードで:
  - **表示 ON/OFF トグル**（`is_visible`）— イマイチな 1 枚を隠す。
  - **ピン留めトグル**（`is_featured`）— 優先表示。
  - ソース記事へのリンク（`/admin/posts/[id]` または公開URL）。
- フィルタ: 表示状態 / ピン留め / カテゴリ（最低限、表示状態だけでも可）。
- 操作は Server Action: `toggleImageVisibility(id)` / `toggleImageFeatured(id)`。

### 5.3 既存 `/admin/media` との違い（混同防止）

| | `/admin/media` | `/admin/gallery`（新規） |
|--|----------------|--------------------------|
| 対象 | thumbnails バケットの**ファイル** | 公開記事に紐づく**画像（post_images）** |
| 操作 | 使用状況チェック / 削除 | 公開ギャラリーの表示・ピン留め |
| 単位 | ストレージ実体 | 記事 × 画像の対応 |

---

## 6. SEO

- `/gallery` は **index 許可**。
- 構造化データ: `ImageGallery` / `ImageObject`（JSON-LD, 既存 `structured-data` に追加）。
- 各 `<img>` に `alt`（`post_images.alt` → 無ければ caption → 無ければ記事タイトル）。
- サイトマップに `/gallery` を追加。
- ※ 画像ごとの個別URLは作らない（クリックは記事へ直行）ため、画像単体のページは sitemap に含めない。

---

## 7. 作らないもの（スコープ外 / 過剰実装の防止）

Claude Code が先回りして作りがちな項目を**明示的に禁止**する。

- ❌ **画像単体の詳細ページ / 個別URL**。クリックは必ず記事へ直行。画像専用ページは作らない。
- ❌ **ライトボックス拡大表示**（今回は「そのまま記事へ」で確定済み。`ImageLightbox` は流用しない）。
- ❌ **ギャラリーからの画像アップロード / 差し替え / 削除**。アップロードは既存エディタ、ファイル削除は `/admin/media` の責務。
- ❌ **ドラッグ&ドロップでの自由並べ替え**。順序制御は `is_featured` のピン留めのみ。
- ❌ **カテゴリ / ハッシュタグでの絞り込み UI**（MVPは全画像・新着順のみ）。
- ❌ **画像 width/height の自動取得による CLS 最適化**（MVP は CSS masonry で割り切る）。
- ❌ **AI による alt / キャプション自動生成**。
- ❌ **重複画像の高度な統合**（同一 image_url が複数記事にある場合の寄せ集約はしない。各記事ぶん表示し、UNIQUE は (post_id, image_url) のみで担保）。
- ❌ **画像サイトマップ（image sitemap 拡張）**。
- ❌ DB トリガによる HTML パース（同期はアプリ層に限定）。

---

## 8. Phase 2（将来 / 今は作らない・着手しない）

> 早すぎる抽象化を避けるため、ここは**箇条書きの言及のみ**に留める。

- カテゴリ / ハッシュタグでのギャラリー絞り込み。
- クリック時に「記事内のその画像位置（アンカー `#fig-...`）」へディープリンク。
- `width/height` 取得による masonry の CLS 対策。
- 画像サイトマップ拡張。
- AI による alt / キャプション自動生成。
- 管理画面でのピン留め順の手動並べ替え（DND）。

---

## 9. 受け入れ条件（MVP 完了の定義）

1. `/gallery` で公開記事の本文画像＋サムネが新着順（ピン留め優先）で表示される。
2. 画像クリックで該当記事 `/{category}/{slug}` に正しく遷移する。
3. 記事を保存・公開/非公開・削除すると、ギャラリーの画像集合が追従する。
4. `/admin/gallery` で画像の表示 ON/OFF とピン留めができ、即 `/gallery` に反映される。
5. 既存 96 記事分の backfill が完了し、欠落・重複が無い。
6. 非公開記事 / 非表示画像が公開ギャラリーに漏れない（RLS と RPC の二重で担保）。

---

## 10. 実装タッチポイント（Claude Code 向け作業マップ）

- **DB**: `post_images` テーブル + RLS + インデックス + RPC `get_gallery_images` のマイグレーション。
- **抽出/同期**: `src/lib/post-images.ts`（`extractPostImages` / `syncPostImages`）。既存記事保存 Action へフック追加。公開トグル箇所へ同期追加。
- **backfill**: `scripts/backfill-post-images.ts`。
- **公開**: `src/app/(public)/gallery/page.tsx` + `_components/InfiniteImageGrid.tsx`（+ タイル）。`src/app/api/gallery/route.ts`。ヘッダー/フッターにリンク追加。
- **管理**: `src/app/(admin)/admin/gallery/page.tsx` + `_components/*` + Server Actions（visibility / featured）。Sidebar 項目追加。
- **SEO**: `structured-data` に `ImageGallery`、`sitemap` に `/gallery`。
