# Data Migration Guide

このガイドでは、既存の記事データをSupabaseデータベースに移行する手順を説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [準備](#準備)
3. [移行手順](#移行手順)
4. [検証](#検証)
5. [トラブルシューティング](#トラブルシューティング)
6. [ロールバック手順](#ロールバック手順)

## 前提条件

### 必要な環境

- Node.js 18以上
- npm または yarn
- Supabaseプロジェクト (既に作成済み)
- 環境変数の設定

### 環境変数

`.env.local`ファイルに以下の変数を設定してください:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**重要**: `SUPABASE_SERVICE_ROLE_KEY`は管理者権限を持つため、取り扱いに注意してください。

### データフォーマット

#### CSVファイル形式

`backup/posts.csv`を以下の形式で準備してください:

```csv
タイトル,スラッグ,本文,抜粋,カテゴリ1,カテゴリ2,カテゴリ3,ハッシュタグ,画像名,公開日
飯田のりんご狩り体験,iida-apple-picking,<p>...</p>,飯田市でりんご狩り体験をしてきました,長野県,飯田市,上郷,飯田りんご,りんご狩り,秋の信州,apple-harvest.jpg,2024-10-15T09:00:00Z
```

#### 画像ファイル

すべての画像を`backup/images/`ディレクトリに配置してください:

```
backup/images/
├── apple-harvest.jpg
├── matsumoto-onsen.jpg
└── karuizawa-cafe.jpg
```

サポートされる画像形式: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`

## 準備

### 1. 依存関係のインストール

```bash
npm install
```

必要なパッケージ:
- `@supabase/supabase-js` - Supabaseクライアント
- `papaparse` - CSV解析
- `@types/papaparse` - TypeScript型定義

### 2. ディレクトリ構造の確認

```bash
# ディレクトリが存在しない場合は作成
mkdir -p backup/images
```

### 3. データの準備

- [ ] CSVファイルを`backup/posts.csv`に配置
- [ ] 画像ファイルを`backup/images/`に配置
- [ ] カテゴリ階層を確認 (必要に応じて`scripts/migrate-categories.ts`を編集)
- [ ] ハッシュタグリストを確認 (必要に応じて`scripts/migrate-hashtags.ts`を編集)

## 移行手順

### ステップ1: カテゴリ階層の作成

都道府県 → 市区町村 → 地区の3階層を作成します。

```bash
npm run migrate:categories
```

**実行内容**:
- 都道府県カテゴリの作成
- 市区町村カテゴリの作成
- 地区カテゴリの作成
- 階層関係の設定 (`parent_id`)

**確認事項**:
- ✅ すべてのカテゴリが作成されたか
- ✅ 階層関係が正しく設定されているか
- ✅ スラッグが重複していないか

### ステップ2: ハッシュタグマスターの作成

よく使うハッシュタグを事前に作成します。

```bash
npm run migrate:hashtags
```

**実行内容**:
- ハッシュタグの作成 (初期カウント: 0)
- スラッグの生成
- 重複チェック

**確認事項**:
- ✅ ハッシュタグが作成されたか
- ✅ スラッグが正しく生成されているか

**注意**: 投稿マイグレーション時に存在しないハッシュタグは自動作成されます。

### ステップ3: 画像のアップロード

ローカルの画像をSupabase Storageにアップロードします。

```bash
npm run migrate:images
```

**実行内容**:
- Storageバケット `thumbnails` の作成 (存在しない場合)
- 画像のアップロード (`YYYY/MM/ファイル名` 形式)
- 公開URLの生成
- URLマッピングの保存 (`backup/image-urls.json`)

**確認事項**:
- ✅ すべての画像がアップロードされたか
- ✅ 公開URLが正しく生成されているか
- ✅ `image-urls.json`が作成されたか

**エラー対処**:
- 「Already exists」エラー: 既にアップロード済み (問題なし)
- 権限エラー: `SUPABASE_SERVICE_ROLE_KEY`を確認
- ファイルサイズエラー: 5MB以下に縮小

### ステップ4: 投稿データの移行

CSVから投稿データをインポートし、カテゴリ・ハッシュタグと関連付けます。

```bash
npm run migrate:posts
```

**実行内容**:
- CSVファイルの読み込み
- 投稿の作成
- カテゴリとの関連付け (`post_categories`)
- ハッシュタグとの関連付け (`post_hashtags`)
- サムネイルURLの設定

**進捗表示例**:
```
[1/80] 📝 Importing: 飯田のりんご狩り体験
   ✅ Post created (ID: abc123)
   🏷️  Linked category: 長野県
   🏷️  Linked category: 飯田市
   #️⃣  Linked hashtag: 飯田りんご
   ✅ Import complete
```

**確認事項**:
- ✅ すべての投稿が作成されたか
- ✅ カテゴリリンクが正しいか
- ✅ ハッシュタグリンクが正しいか
- ✅ 画像URLが設定されているか

**エラー対処**:
- エラーログは`migration-errors.log`に保存されます
- 個別エラーは該当行をスキップして続行されます

### ステップ5: データ検証

移行したデータの整合性を確認します。

```bash
npm run validate
```

**検証項目**:

1. **投稿の検証**
   - 投稿数のカウント
   - カテゴリのない投稿 (orphaned posts) のチェック
   - スラッグの重複チェック
   - 公開状態の確認

2. **カテゴリの検証**
   - 階層構造の確認 (都道府県/市区町村/地区)
   - 親カテゴリの存在確認
   - スラッグの重複チェック

3. **ハッシュタグの検証**
   - ハッシュタグ数のカウント
   - カウント値の整合性チェック

4. **画像の検証**
   - サムネイルURLの存在確認
   - URLの形式チェック

5. **リレーションの検証**
   - post_categories の整合性
   - post_hashtags の整合性
   - 外部キー制約の確認

**出力例**:
```
📊 VALIDATION SUMMARY
==========================================================
Total Checks: 12
✅ Passed: 12
❌ Failed: 0

✅ All validation checks passed!
```

## 検証

### Supabase Studioで確認

1. [Supabase Studio](https://supabase.com/dashboard) にログイン
2. Table Editorで以下を確認:
   - `posts` テーブル: 投稿数
   - `categories` テーブル: カテゴリ階層
   - `hashtags` テーブル: ハッシュタグとカウント
   - `post_categories`, `post_hashtags`: リレーションシップ

### フロントエンドで確認

```bash
npm run dev
```

http://localhost:3000 にアクセスして以下を確認:

- [ ] トップページに記事が表示される
- [ ] 都道府県フィルタが機能する
- [ ] カテゴリフィルタが機能する
- [ ] ハッシュタグフィルタが機能する
- [ ] 検索が機能する
- [ ] 記事詳細ページが表示される
- [ ] 画像が正しく表示される

## トラブルシューティング

### よくある問題

#### 1. 環境変数が読み込まれない

**症状**: `Missing required environment variables` エラー

**解決策**:
```bash
# .env.local ファイルが存在するか確認
ls -la .env.local

# 環境変数を再読み込み
source .env.local  # または .bashrc に設定

# 確認
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### 2. CSVファイルが見つからない

**症状**: `CSV file not found: ./backup/posts.csv`

**解決策**:
```bash
# ディレクトリ構造を確認
ls -R backup/

# CSVファイルを配置
cp /path/to/your/posts.csv backup/posts.csv
```

#### 3. 画像アップロードが失敗する

**症状**: `Failed to upload` エラー

**解決策**:
- ファイルサイズを確認 (5MB以下)
- ファイル形式を確認 (.jpg, .png, .webp, .gif)
- Service Roleキーの権限を確認
- バケットのポリシーを確認 (public access)

#### 4. カテゴリが関連付けられない

**症状**: `Category not found` 警告

**解決策**:
```typescript
// scripts/migrate-categories.ts を編集
// CSVに記載されているカテゴリ名と一致させる
const cities = [
  { name: '飯田市', slug: 'iida', order_num: 1 },  // ← CSV の「カテゴリ2」と一致
]
```

#### 5. ハッシュタグのカウントが合わない

**症状**: Validation で `Hashtag count mismatch` エラー

**解決策**:
```sql
-- Supabase SQL Editorで実行
-- ハッシュタグカウントを再計算
UPDATE hashtags h
SET count = (
  SELECT COUNT(*)
  FROM post_hashtags ph
  WHERE ph.hashtag_id = h.id
);
```

### デバッグモード

各スクリプトに詳細ログを追加:

```typescript
// デバッグ用のログ追加
console.log('[DEBUG] Category data:', category)
console.log('[DEBUG] Hashtag data:', hashtag)
```

## ロールバック手順

### 全データを削除 (注意!)

**警告**: この操作は元に戻せません。必ずバックアップを取ってから実行してください。

```sql
-- Supabase SQL Editorで実行

-- 1. リレーションシップを削除
DELETE FROM post_hashtags;
DELETE FROM post_categories;

-- 2. 投稿を削除
DELETE FROM posts;

-- 3. カテゴリを削除 (階層の深い順)
DELETE FROM categories WHERE parent_id IS NOT NULL AND id IN (
  SELECT c1.id FROM categories c1
  INNER JOIN categories c2 ON c1.parent_id = c2.id
  WHERE c2.parent_id IS NOT NULL
);
DELETE FROM categories WHERE parent_id IS NOT NULL;
DELETE FROM categories WHERE parent_id IS NULL;

-- 4. ハッシュタグを削除
DELETE FROM hashtags;

-- 5. シーケンスをリセット (オプション)
ALTER SEQUENCE posts_id_seq RESTART WITH 1;
ALTER SEQUENCE categories_id_seq RESTART WITH 1;
ALTER SEQUENCE hashtags_id_seq RESTART WITH 1;
```

### 画像の削除

```bash
# Supabase CLI を使用 (または Studio の Storage UI)
supabase storage rm thumbnails --all
```

### 再移行

```bash
# 全スクリプトを順番に再実行
npm run migrate:categories
npm run migrate:hashtags
npm run migrate:images
npm run migrate:posts
npm run validate
```

## 移行後のチェックリスト

- [ ] 全投稿が正常にインポートされた
- [ ] カテゴリ階層が正しく構築された
- [ ] ハッシュタグが正しく関連付けられた
- [ ] 画像が正しく表示される
- [ ] 検索機能が動作する
- [ ] フィルタ機能が動作する
- [ ] URLが正しい形式 (`/[prefecture]/[slug]/`)
- [ ] パンくずリストが正しく表示される
- [ ] メタデータ (OGP) が正しく設定されている
- [ ] 本番環境でのテスト完了

## カスタマイズ

### カテゴリ階層の変更

`scripts/migrate-categories.ts` の `categoryHierarchy` 配列を編集:

```typescript
const categoryHierarchy: Prefecture[] = [
  {
    name: '長野県',
    slug: 'nagano',
    order_num: 1,
    cities: [
      { name: '飯田市', slug: 'iida', order_num: 1 },
      // ← 都市を追加
    ],
  },
  // ← 都道府県を追加
]
```

### ハッシュタグの追加

`scripts/migrate-hashtags.ts` の `commonHashtags` 配列を編集:

```typescript
const commonHashtags = [
  '飯田りんご',
  '信州そば',
  // ← ハッシュタグを追加
]
```

## サポート

問題が解決しない場合:

1. [GitHub Issues](https://github.com/your-repo/issues) で報告
2. `migration-errors.log` の内容を添付
3. 実行したコマンドと環境情報を記載

---

**最終更新**: 2025-11-15
**バージョン**: 1.0.0
