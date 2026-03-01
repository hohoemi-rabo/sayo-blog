# Ticket 22: ナレッジデータ管理（Admin CRUD）

> **優先度**: Phase 2a（最優先）
> **依存**: 20（DB スキーマ）
> **ブロック**: 23

---

## 概要

管理画面にナレッジデータの CRUD 機能を追加する。ナレッジデータは AI チャットの知識源であり、記事ごとに 1 レコード存在する。ライターとエンジニアがレビュー・編集できる管理画面を提供する。

---

## 実装内容

### 1. 管理画面サイドバーの拡張

`src/components/admin/Sidebar.tsx` に 3 つのメニューを追加:

| メニュー | パス | アイコン |
|---------|------|--------|
| AI Knowledge | `/admin/ai/knowledge` | Brain / BookOpen 等 |
| AI Tags | `/admin/ai/tags` | Tags 等 |
| AI Analytics | `/admin/ai/analytics` | BarChart 等 |

> AI Tags (Ticket 27) と AI Analytics (Ticket 28) のページは後続チケットで実装。サイドバーのリンクのみ先に追加。

### 2. ナレッジ一覧ページ (`/admin/ai/knowledge`)

**表示内容**:

| カラム | 説明 |
|--------|------|
| 記事タイトル | metadata.title |
| カテゴリ | metadata.category |
| ステータス | 有効 / 無効（is_active） |
| Embedding | あり / なし（embedding IS NOT NULL） |
| 最終更新 | updated_at |
| 「要更新」バッジ | 元記事の updated_at > ナレッジの updated_at の場合に表示 |

**機能**:
- ステータス（有効/無効）でフィルタ
- 「要更新」のみ表示フィルタ
- 「一括生成」ボタン（Ticket 23 で実装、ここでは UI のみ）
- 個別の「新規作成」ボタン
- 記事数とナレッジ数の表示（例: "50記事中 45件のナレッジ"）

**データ取得**:
- `article_knowledge` テーブルを LEFT JOIN `posts` で取得
- ナレッジ未作成の記事も一覧に表示する（ナレッジなしとして）

### 3. ナレッジ新規作成ページ (`/admin/ai/knowledge/new`)

**記事選択**:
- ナレッジ未作成の公開記事一覧から選択
- 選択後、元記事の内容をプレビュー表示

**フォーム**: 編集ページと同じ（セクション 4 参照）

### 4. ナレッジ編集ページ (`/admin/ai/knowledge/[id]`)

**2 カラムレイアウト**:

| 左カラム | 右カラム |
|---------|---------|
| メタデータフォーム + コンテンツエディタ | 元記事プレビュー |

**左カラム — メタデータフォーム**:

| フィールド | 型 | 説明 |
|-----------|-----|------|
| title | text input | 記事タイトル |
| category | select | カテゴリ slug |
| area | text input | エリア名 |
| summary | textarea | 要約（2〜3 文） |
| keywords | text input (カンマ区切り) | 検索キーワード |
| hashtags | multi-select | ハッシュタグ |
| published_at | date input | 公開日 |

**左カラム — スポット情報セクション**:

スポットは動的に追加・削除できるフォーム:

| フィールド | 型 |
|-----------|-----|
| name | text input |
| address | text input |
| phone | text input |
| hours | text input |
| note | text input |

「+ スポットを追加」ボタンで行を追加、各行に削除ボタン。

**左カラム — コンテンツ**:

- マークダウンテキストエリア（プレーンな textarea、構造化マークダウン）
- プレビュー切り替え可能（マークダウン → HTML）

**右カラム — 元記事プレビュー**:
- 元記事の HTML コンテンツを `prose` スタイルで表示
- スクロール可能
- 「要更新」バッジ表示（元記事が更新されている場合）

**有効/無効トグル**: is_active の切り替え

**保存ボタン**: 保存時に metadata + content を更新（Embedding の再生成は Ticket 23）

### 5. Server Actions

**ファイル**: `src/app/(admin)/admin/ai/knowledge/actions.ts`

```typescript
// 一覧取得（ナレッジ + 元記事の情報）
getKnowledgeList(filter?: { status?: string; needsUpdate?: boolean })

// 単一取得
getKnowledge(id: string)

// 新規作成
createKnowledge(data: { post_id: string; metadata: KnowledgeMetadata; content: string })

// 更新
updateKnowledge(id: string, data: { metadata: KnowledgeMetadata; content: string; is_active: boolean })

// 削除
deleteKnowledge(id: string)

// 有効/無効の一括切り替え
toggleKnowledgeActive(ids: string[], is_active: boolean)
```

### 6. キャッシュ無効化

ナレッジの作成・更新・削除時:
- `revalidatePath('/admin/ai/knowledge')`
- 公開ページへの影響はなし（AI チャット API はリアルタイムで DB を参照するため）

---

## ファイル構成

```
src/app/(admin)/admin/ai/
├── knowledge/
│   ├── page.tsx                    # 一覧ページ
│   ├── new/page.tsx                # 新規作成ページ
│   ├── [id]/page.tsx               # 編集ページ
│   ├── actions.ts                  # Server Actions
│   └── _components/
│       ├── KnowledgeList.tsx        # 一覧コンポーネント
│       ├── KnowledgeForm.tsx        # 編集フォーム
│       ├── SpotFieldArray.tsx       # スポット動的フォーム
│       └── ArticlePreview.tsx       # 元記事プレビュー
├── tags/
│   └── page.tsx                    # プレースホルダー (Ticket 27)
└── analytics/
    └── page.tsx                    # プレースホルダー (Ticket 28)
```

---

## 完了条件

- [×] サイドバーに AI Knowledge / AI Tags / AI Analytics のリンクが表示される
- [×] ナレッジ一覧で記事とナレッジの紐づき状態が確認できる
- [×] 「要更新」バッジが正しく表示される
- [×] ナレッジの新規作成・編集・削除ができる
- [×] スポット情報の動的追加・削除ができる
- [×] 元記事のプレビューが右カラムに表示される
- [×] `npm run build` が成功する
