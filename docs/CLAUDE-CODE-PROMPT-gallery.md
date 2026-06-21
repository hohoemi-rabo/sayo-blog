# 指示: 画像ギャラリー機能の実装（Sayo's Journal）

紗代さんがこだわって撮った写真から記事に入る導線を追加する。公開ページ `/gallery` に
記事中の全画像を並べ、クリックで該当記事へ直行。管理 `/admin/gallery` で表示ON/OFFと
ピン留めだけできる。

## 前提（すでにリポジトリに配置済み。これらは「与件」として扱う）

- `REQUIREMENTS-gallery.md` … この機能の唯一の仕様書。詳細はすべてこれに従う。
- `src/lib/post-images.ts` … 画像抽出の心臓部 `extractPostImages()`。**実装済み・検証済み。中身は変更しない**。
- `src/lib/post-images.test.ts` … 上記のテスト。`node --experimental-strip-types --test` で12件 green。**常に green を維持**。

## 絶対に守る制約（house rules）

1. **`extractPostImages` の中身を書き換えない**。呼び出すだけ。
2. **`parsePostSections`（post-sections.ts）を画像抽出に流用しない**。理由は post-images.ts 冒頭参照。
3. HTML パース用の新規依存（cheerio / node-html-parser 等）を**入れない**。抽出は post-images.ts に集約済み。
4. 既存の規約に揃える: Supabase 3クライアント（公開書き込みは `createAdminClient()` で RLS バイパス）、RLS は `(select auth.role()) = 'authenticated'`、部分インデックス、framer-motion 不使用＝CSSアニメのみ。
5. 記事URLの組み立ては**既存ロジックを再利用**する（PostCard 等が使っている記事リンク生成。主カテゴリの選び方も既存に合わせる）。新たに自前で URL を組まない。
6. `REQUIREMENTS-gallery.md` の「§7 作らないもの」を厳守（下に再掲）。

## 実装手順（この順番で。各ステップ後に型チェック／ビルドを通すこと）

### Step 1 — DB マイグレーション
- `post_images` テーブル（仕様 §2.1）。`post_id` は posts への FK ON DELETE CASCADE。UNIQUE(post_id, image_url)。
- 非正規化列 `post_is_published` / `post_published_at` を含める。
- RLS 有効化（匿名 SELECT は `post_is_published AND is_visible`、authenticated は ALL）。
- インデックス `idx_post_images_gallery_partial`（§2.4）と FK インデックス。
- RPC `get_gallery_images(p_limit int, p_offset int)`（SECURITY DEFINER）: post_images ⨝ posts ⨝ 主カテゴリ を結合し、公開済み＆表示ONのみを `is_featured DESC, post_published_at DESC, position ASC` で返す。返却列は仕様 §4.2。

### Step 2 — 同期ロジックと保存フック
- `src/lib/post-images.ts` に `syncPostImages(postId)` を追加（DBアクセスはこの関数に限定）:
  記事取得 → `extractPostImages()` → 当該 post_id の行を delete→insert → 非正規化列を記事の現状で埋める。`createAdminClient()` 使用。
- 既存の記事保存 Server Action（PostForm の保存処理）の content 書き込み直後に `syncPostImages` を呼ぶ。
- `is_published` トグル箇所で、該当記事の `post_images.post_is_published / post_published_at` を更新（または `syncPostImages` 再実行）。

### Step 3 — backfill
- `scripts/backfill-post-images.ts`（冪等）。全 posts を走査し `syncPostImages` 相当を実行。
- 実行して **件数を報告**（記事数 / 生成画像行数 / サムネ由来件数）。

> **★ ここで一旦停止し、backfill の件数と post_images の中身を確認してもらう。UI 着手はその後。**

### Step 4 — 公開ギャラリー `/gallery`
- `src/app/(public)/gallery/page.tsx`（(public) レイアウト配下）。
- 取得は RPC `get_gallery_images`。追加読込は `GET /api/gallery?offset=&limit=` で RPC をラップ（既存 `/api/posts` と同形）。
- `_components/InfiniteImageGrid.tsx`（既存 InfinitePostGrid を踏襲、CSS masonry）。各タイルは記事への `<a>`。**ライトボックスなし・クリックで記事へ直行**。
- ホバーで記事タイトル＋キャプション表示。画像は遅延読込、既存の画像設定（next/image ドメイン）を再利用。
- ヘッダー／フッターのナビに「ギャラリー」リンクを追加。

### Step 5 — 管理 `/admin/gallery`
- `src/app/(admin)/admin/gallery/page.tsx`（noindex）。Sidebar にメニュー追加。
- 全 post_images（非公開記事の画像も状態バッジ付きで表示）をグリッド表示。
- 各カードで `is_visible` トグル・`is_featured` トグル・ソース記事リンク。Server Action `toggleImageVisibility` / `toggleImageFeatured`。
- **アップロード・削除機能は付けない**（既存エディタ／`/admin/media` の責務）。`/admin/media` とは別物。

### Step 6 — SEO ＆仕上げ
- `/gallery` は index 許可。`structured-data` に `ImageGallery`/`ImageObject` を追加。sitemap に `/gallery` を追加。
- `<img alt>` は `post_images.alt` → caption → 記事タイトル の順でフォールバック。

各ステップ後に `npm run build`（または型チェック）を通し、post-images.test.ts が green のままであることを確認する。

## 確定済みの選択（迷わない）

- ルート名: **`/gallery`**
- 管理: **新規 `/admin/gallery`**（`/admin/media` とは分離）
- 並び順: **ピン留め → 記事の新着 → 記事内の位置**（`is_featured DESC, post_published_at DESC, position ASC`）

## 作らないもの（厳守・再掲）

画像個別ページ/個別URL ❌ / ライトボックス拡大 ❌ / ギャラリーからのアップロード・差し替え・削除 ❌ /
DnD 並べ替え ❌（順序は is_featured のみ） / カテゴリ・タグ絞り込みUI ❌（MVPは新着順のみ） /
width/height 自動取得によるCLS最適化 ❌ / AIによる alt・caption 自動生成 ❌ /
重複画像の高度な統合 ❌（dedupは UNIQUE(post_id,image_url) のみ） / 画像サイトマップ ❌ /
DBトリガでのHTMLパース ❌（同期はアプリ層）。

## 完了の定義

1. `/gallery` に公開記事の本文画像＋サムネが正しい順で並ぶ。
2. 画像クリックで該当記事 `/{category}/{slug}` に遷移する。
3. 記事の保存／公開・非公開／削除にギャラリーが追従する。
4. `/admin/gallery` の表示ON/OFF・ピン留めが `/gallery` に反映される。
5. backfill 完了（欠落・重複なし）。
6. 非公開記事／非表示画像が公開ギャラリーに漏れない（RLS と RPC の二重で担保）。
7. `post-images.test.ts` が green、ビルドが通る。
