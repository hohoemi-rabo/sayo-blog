# 16: Payload CMS 管理画面実装

> **⚠️ このチケットは廃止されました**
>
> Payload CMSとSupabaseの相性問題により、カスタム管理画面での実装に変更しました。
>
> **代替チケット**: [docs/17_admin-panel.md](./17_admin-panel.md)

---

## Overview (廃止)

Payload CMSを使用して、ライターが記事を作成・編集できる管理画面を実装する。WordPressライクな使い心地で、リッチテキストエディタによる画像挿入、カテゴリ・ハッシュタグ管理、下書き保存などのプロ仕様の機能を提供。

## Related Files

### 新規作成
- `payload.config.ts` - Payload CMS設定ファイル
- `src/app/(payload)/admin/[[...segments]]/page.tsx` - 管理画面ルート
- `src/collections/Posts.ts` - 記事コレクション定義
- `src/collections/Categories.ts` - カテゴリコレクション定義
- `src/collections/Hashtags.ts` - ハッシュタグコレクション定義
- `src/collections/Media.ts` - メディアコレクション定義
- `src/collections/Users.ts` - ユーザーコレクション定義
- `src/payload/hooks/syncToSupabase.ts` - Supabase同期フック
- `src/payload/fields/richText.ts` - リッチテキストエディタ設定

### 変更
- `next.config.js` - Payload CMS統合設定
- `package.json` - Payload依存関係追加

## Technical Details

### アーキテクチャ

```
Next.js 15 App Router
├─ Frontend (既存)
│   ├─ / - トップページ
│   ├─ /[prefecture]/[slug] - 記事詳細
│   └─ /search - 検索
│
└─ Backend (新規)
    └─ /admin - Payload CMS管理画面
        ├─ /admin/collections/posts - 記事管理
        ├─ /admin/collections/categories - カテゴリ管理
        ├─ /admin/collections/hashtags - ハッシュタグ管理
        └─ /admin/collections/media - メディアライブラリ
```

### データフロー

```
ライター
  ↓ (記事作成)
Payload CMS
  ↓ (afterChange hook)
Supabase
  ↓ (RLS/Triggers)
フロントエンド (自動反映)
```

### Payload Collections 構造

#### Posts Collection

```typescript
{
  slug: 'posts',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, admin: { position: 'sidebar' } },
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          ImageFeature(),
          LinkFeature(),
          HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3'] }),
        ]
      })
    },
    { name: 'excerpt', type: 'textarea', required: true },
    { name: 'thumbnail', type: 'upload', relationTo: 'media' },
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true },
    { name: 'hashtags', type: 'relationship', relationTo: 'hashtags', hasMany: true },
    { name: 'published_at', type: 'date' },
    { name: 'view_count', type: 'number', admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: '下書き', value: 'draft' },
        { label: '公開', value: 'published' },
      ],
      defaultValue: 'draft',
    },
  ],
  hooks: {
    afterChange: [syncToSupabase],
  },
}
```

#### Categories Collection

```typescript
{
  slug: 'categories',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true },
    { name: 'parent', type: 'relationship', relationTo: 'categories' },
    { name: 'order_num', type: 'number' },
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'is_active', type: 'checkbox', defaultValue: true },
  ],
  admin: {
    useAsTitle: 'name',
  },
}
```

#### Hashtags Collection

```typescript
{
  slug: 'hashtags',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true },
    { name: 'count', type: 'number', admin: { readOnly: true } },
  ],
  admin: {
    useAsTitle: 'name',
  },
}
```

#### Media Collection

```typescript
{
  slug: 'media',
  upload: {
    staticDir: 'media', // ローカル一時保存
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300 },
      { name: 'card', width: 768, height: 432 },
      { name: 'hero', width: 1920, height: 1080 },
    ],
  },
  fields: [
    { name: 'alt', type: 'text' },
    { name: 'caption', type: 'text' },
  ],
  hooks: {
    afterChange: [uploadToSupabaseStorage],
  },
}
```

#### Users Collection

```typescript
{
  slug: 'users',
  auth: true,
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: [
        { label: '管理者', value: 'admin' },
        { label: 'ライター', value: 'writer' },
      ],
      defaultValue: ['writer'],
    },
  ],
  admin: {
    useAsTitle: 'name',
  },
}
```

### Supabase 同期フック

```typescript
// src/payload/hooks/syncToSupabase.ts

export const syncToSupabase = async ({ doc, operation }) => {
  const supabase = createClient()

  if (operation === 'create' || operation === 'update') {
    // Payloadのデータ構造をSupabaseに変換
    const postData = {
      title: doc.title,
      slug: doc.slug,
      content: convertLexicalToHTML(doc.content), // Lexical → HTML
      excerpt: doc.excerpt,
      thumbnail_url: doc.thumbnail?.url || null,
      is_published: doc.status === 'published',
      published_at: doc.published_at || new Date().toISOString(),
      view_count: doc.view_count || 0,
    }

    // Supabaseにupsert
    const { data: post } = await supabase
      .from('posts')
      .upsert({ ...postData, payload_id: doc.id })
      .select()
      .single()

    // カテゴリ関連付け
    if (doc.categories?.length > 0) {
      await supabase.from('post_categories').delete().eq('post_id', post.id)

      for (const categoryId of doc.categories) {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('payload_id', categoryId)
          .single()

        await supabase.from('post_categories').insert({
          post_id: post.id,
          category_id: category.id,
        })
      }
    }

    // ハッシュタグ関連付け
    if (doc.hashtags?.length > 0) {
      await supabase.from('post_hashtags').delete().eq('post_id', post.id)

      for (const hashtagId of doc.hashtags) {
        const { data: hashtag } = await supabase
          .from('hashtags')
          .select('id')
          .eq('payload_id', hashtagId)
          .single()

        await supabase.from('post_hashtags').insert({
          post_id: post.id,
          hashtag_id: hashtag.id,
        })
      }
    }
  }

  return doc
}
```

### 画像アップロードフロー

```
1. ライターが画像をドラッグ&ドロップ
   ↓
2. Payload CMSがローカルに一時保存
   ↓
3. afterChangeフックでSupabase Storageにアップロード
   ↓
4. 公開URLを取得してPayloadに保存
   ↓
5. 記事保存時、画像URLがSupabaseにも同期
```

## Todo

### Prerequisites

- [×] Ticket 11 完了（データマイグレーション）
- [ ] Supabaseテーブルに `payload_id` カラム追加
- [ ] Payload CMS依存関係の理解

### Payload CMSセットアップ

- [ ] Payload CMSパッケージインストール
  - [ ] `@payloadcms/next`
  - [ ] `@payloadcms/richtext-lexical`
  - [ ] `@payloadcms/plugin-cloud-storage`
  - [ ] `payload`
- [ ] `payload.config.ts` 作成
- [ ] 基本設定（admin URL、データベース接続等）
- [ ] 管理画面ルート設定 (`/admin`)
- [ ] MongoDBまたはPostgreSQL接続設定（Payload用）
- [ ] ビルド設定の調整

### Collections実装

- [ ] Posts Collection作成
  - [ ] フィールド定義
  - [ ] リッチテキストエディタ設定（Lexical）
  - [ ] 画像挿入機能
  - [ ] スラッグ自動生成（タイトルから）
  - [ ] ステータス管理（下書き/公開）
  - [ ] Supabase同期フック
- [ ] Categories Collection作成
  - [ ] 階層構造対応（parent フィールド）
  - [ ] Supabase同期フック
- [ ] Hashtags Collection作成
  - [ ] スラッグ自動生成
  - [ ] Supabase同期フック
- [ ] Media Collection作成
  - [ ] 画像サイズ設定（thumbnail, card, hero）
  - [ ] Supabase Storage連携
  - [ ] 公開URL生成
- [ ] Users Collection作成
  - [ ] 認証設定
  - [ ] ロール管理（admin, writer）
  - [ ] 初期ユーザー作成（2名）

### Supabase統合

- [ ] Supabaseテーブル拡張
  - [ ] `posts.payload_id` カラム追加
  - [ ] `categories.payload_id` カラム追加
  - [ ] `hashtags.payload_id` カラム追加
- [ ] 同期フック実装 (`syncToSupabase.ts`)
  - [ ] 記事データ変換（Lexical → HTML）
  - [ ] カテゴリリレーション同期
  - [ ] ハッシュタグリレーション同期
  - [ ] エラーハンドリング
- [ ] 画像アップロードフック実装
  - [ ] Supabase Storageアップロード
  - [ ] 公開URL取得
  - [ ] メタデータ保存
- [ ] 双方向同期確認
  - [ ] Payload → Supabase
  - [ ] データ整合性チェック

### UI/UXカスタマイズ

- [ ] 日本語化
  - [ ] UIラベル翻訳
  - [ ] エラーメッセージ翻訳
  - [ ] フィールド説明文
- [ ] デザイン調整
  - [ ] ロゴ設定（Sayo's Journal）
  - [ ] カラースキーム（プロジェクトに合わせる）
  - [ ] ダッシュボードレイアウト
- [ ] リッチテキストエディタ調整
  - [ ] 見出しレベル設定（H1, H2, H3）
  - [ ] 画像挿入UI
  - [ ] リンク挿入
  - [ ] ツールバーカスタマイズ

### 機能実装

- [ ] 下書き保存機能
- [ ] プレビュー機能
  - [ ] プレビューURL生成
  - [ ] フロントエンドプレビューページ作成
- [ ] スケジュール公開（オプション）
- [ ] バージョン履歴（Payload標準機能）
- [ ] 検索機能（管理画面内）
- [ ] 一括操作（公開、削除等）

### セキュリティ・権限

- [ ] 認証設定
  - [ ] ログイン画面カスタマイズ
  - [ ] パスワードリセット
  - [ ] セッション管理
- [ ] ロール別権限設定
  - [ ] admin: すべての権限
  - [ ] writer: 記事のCRUD、メディアアップロード
- [ ] RLS（Row Level Security）との連携
- [ ] CSRF対策
- [ ] セキュアなAPI設定

### テスト・検証

- [ ] 記事作成フローテスト
  - [ ] タイトル・本文入力
  - [ ] 画像挿入（本文途中）
  - [ ] カテゴリ選択
  - [ ] ハッシュタグ追加
  - [ ] サムネイル設定
  - [ ] 下書き保存
  - [ ] プレビュー確認
  - [ ] 公開
- [ ] Supabase同期テスト
  - [ ] データが正しく同期されるか
  - [ ] リレーションシップが正しいか
  - [ ] 画像URLが正しいか
- [ ] フロントエンド表示テスト
  - [ ] トップページに記事が表示されるか
  - [ ] 記事詳細ページが正しく表示されるか
  - [ ] 画像が正しく表示されるか
  - [ ] カテゴリフィルタが動作するか
- [ ] パフォーマンステスト
  - [ ] 大量の記事作成時の動作
  - [ ] 画像アップロード速度
  - [ ] ページ読み込み速度

### ドキュメント作成

- [ ] ライター向けマニュアル作成
  - [ ] ログイン方法
  - [ ] 記事作成手順（スクリーンショット付き）
  - [ ] 画像挿入方法
  - [ ] カテゴリ・ハッシュタグの使い方
  - [ ] 下書き保存・公開の違い
  - [ ] プレビュー機能の使い方
  - [ ] よくあるトラブルと解決法
- [ ] 管理者向けマニュアル作成
  - [ ] ユーザー管理
  - [ ] カテゴリ・ハッシュタグ管理
  - [ ] メディアライブラリ管理
  - [ ] トラブルシューティング
- [ ] README.md更新
  - [ ] 管理画面へのアクセス方法
  - [ ] 環境変数の追加
  - [ ] セットアップ手順

### デプロイ設定

- [ ] 環境変数設定
  - [ ] `PAYLOAD_SECRET`
  - [ ] `PAYLOAD_PUBLIC_SERVER_URL`
  - [ ] MongoDB/PostgreSQL接続文字列（Payload用）
- [ ] Vercelデプロイ設定
  - [ ] ビルドコマンド調整
  - [ ] サーバーレス関数設定
  - [ ] 静的ファイルパス設定
- [ ] 本番環境テスト

## Architecture Decisions

### なぜPayload CMSか？

1. **Next.js 15完全対応** - App Routerネイティブサポート
2. **TypeScript完全対応** - 型安全な開発
3. **柔軟なカスタマイズ** - コードベースの設定
4. **プロ仕様の機能** - リッチエディタ、バージョン管理等が標準搭載
5. **オープンソース** - 無料、コミュニティサポート
6. **Supabase連携可能** - フックでカスタム同期実装

### データ保存先

#### Payload CMS内部（MongoDB/PostgreSQL）
- 記事の下書き
- バージョン履歴
- ユーザー情報
- セッション

#### Supabase（PostgreSQL）
- 公開された記事データ
- カテゴリ・ハッシュタグマスター
- リレーションシップ
- フロントエンド表示用

#### Supabase Storage
- アップロードされた画像
- サムネイル画像
- メディアファイル

**メリット：**
- Payloadの高機能エディタを活用
- Supabaseの高速クエリでフロントエンド表示
- 既存のフロントエンドコード変更不要

## References

- [Payload CMS Documentation](https://payloadcms.com/docs)
- [Payload + Next.js 15](https://payloadcms.com/docs/getting-started/installation)
- [Lexical Rich Text Editor](https://payloadcms.com/docs/rich-text/lexical)
- [Payload Cloud Storage Plugin](https://payloadcms.com/docs/plugins/cloud-storage)
- [Payload Hooks](https://payloadcms.com/docs/hooks/overview)

## Success Criteria

- [ ] ライターが管理画面にログインできる
- [ ] 記事を作成・編集・削除できる
- [ ] 本文途中に画像を挿入できる
- [ ] カテゴリ・ハッシュタグを設定できる
- [ ] 下書き保存と公開が正しく動作する
- [ ] プレビュー機能が動作する
- [ ] Payload → Supabaseの同期が正常に動作する
- [ ] フロントエンドに公開記事が表示される
- [ ] 画像が正しく表示される（サムネイル、本文中）
- [ ] ライター向けマニュアルが完成している
- [ ] 2名のユーザーアカウントが作成されている
- [ ] WordPressと同等の使いやすさを実現

## Notes

### 画像挿入の仕組み

記事本文中の画像挿入は、Lexical RichTextエディタの標準機能を使用：

```typescript
// リッチテキストエディタ内で画像を挿入
1. カーソルを置く
2. 画像ボタンをクリック
3. ドラッグ&ドロップまたはファイル選択
4. → 自動的にSupabase Storageにアップロード
5. → エディタ内に画像が挿入される
6. → 記事保存時、HTML内に<img>タグとして保存される
```

### Supabase同期のタイミング

- **即時同期**: 記事を「公開」にした時のみ
- **下書き**: Payload内部のみに保存（Supabaseに同期しない）
- **更新**: 公開済み記事を編集した場合、保存時に即座に同期

### ライターの権限

| 操作 | ライター | 管理者 |
|------|---------|--------|
| 記事作成・編集 | ✅ | ✅ |
| 記事削除 | ✅（自分の記事のみ） | ✅ |
| カテゴリ作成 | ❌ | ✅ |
| ハッシュタグ作成 | ✅ | ✅ |
| ユーザー管理 | ❌ | ✅ |
| 画像アップロード | ✅ | ✅ |

## Timeline Estimate

- **セットアップ**: 1日
- **Collections実装**: 1日
- **Supabase統合**: 1日
- **UI/UXカスタマイズ**: 0.5日
- **テスト・検証**: 0.5日
- **ドキュメント作成**: 0.5日
- **デプロイ**: 0.5日

**合計: 5日**（余裕を持って1週間）
