# Ticket 27: AI プロンプトタグ

> **優先度**: Phase 2b（安定化）
> **依存**: 20（DB スキーマ）, 25（Chat UI）
> **ブロック**: なし

---

## 概要

チャットページのタグ機能と、管理画面でのタグ CRUD を実装する。タグはユーザーの質問のきっかけを提供し、「何を聞いていいかわからない」状態を解消する重要な UX 要素。

---

## 実装内容

### 1. GET /api/ai/tags

**ファイル**: `src/app/api/ai/tags/route.ts`

有効なプロンプトタグを取得する API。

**レスポンス**:
```json
{
  "tags": [
    { "id": "uuid", "label": "ランチを探す", "prompt": "飯田市でおすすめのランチスポットを教えて", "tag_type": "purpose" },
    { "id": "uuid", "label": "天龍峡", "prompt": "天龍峡エリアのおすすめスポットを教えて", "tag_type": "area" },
    { "id": "uuid", "label": "子連れで行ける", "prompt": "子連れで楽しめるスポットを教えて", "tag_type": "scene" }
  ]
}
```

- `is_active = true` のタグのみ返す
- `order_num` 昇順でソート
- キャッシュ: ISR `revalidate = 3600`（1 時間）

### 2. チャットページでのタグ表示

**表示位置**: 入力欄の上に常時表示

**レイアウト**:
- 横スクロール（モバイル）or フレックスラップ（デスクトップ）
- タグ種別ごとにグルーピング or 色分け:
  - purpose: プライマリカラー系
  - area: ブルー系
  - scene: グリーン系

**タグの見た目**:
- ピル型ボタン（rounded-full）
- コンパクトなサイズ（text-sm, px-3 py-1.5）
- ホバー・タップで色変化

### 3. タグクリック動作

1. タグをクリック
2. 対応する `prompt` テキストを入力欄にセット
3. 自動送信（ユーザーが入力内容を確認する間もなく送信）
4. 会話エリアにユーザーメッセージとして表示される内容は `label` ではなく `prompt`

### 4. 回答内の関連タグ提案

Ticket 24 の Chat API が返す `{ type: 'suggestions' }` イベントで、回答に関連するタグを提案:

- FUNE の回答末尾に「こちらも聞いてみては？」セクションとして表示
- 既存のタグ一覧から関連性の高いものを 2〜3 個選択
- クリック → タグクリックと同じ動作（prompt を送信）

### 5. 管理画面: AI Tags ページ (`/admin/ai/tags`)

**一覧画面**:

| カラム | 説明 |
|--------|------|
| ラベル | 表示テキスト |
| プロンプト | AI に送信する質問文 |
| 種別 | purpose / area / scene |
| 表示順 | order_num |
| 有効/無効 | is_active トグル |
| アクション | 編集 / 削除 |

**機能**:
- 新規追加
- 編集（インライン or モーダル）
- 削除（確認ダイアログ）
- 並び替え（order_num の変更）
- 有効/無効の切り替え
- 「AI で一括生成」ボタン

### 6. タグ編集フォーム

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| label | text | YES | 表示テキスト（例: "ランチを探す"） |
| prompt | textarea | YES | AI に送信する質問文 |
| tag_type | select | YES | purpose / area / scene |
| order_num | number | YES | 表示順 |
| is_active | checkbox | YES | 表示するか |

### 7. AI 一括生成機能

**「AI で一括生成」ボタン**:

1. クリック → 確認ダイアログ
2. 全ナレッジデータ（article_knowledge）を取得
3. Gemini に送信:
   - 「以下の記事情報を分析し、ユーザーが質問しそうなタグを生成してください」
   - 種別ごとに 5〜10 個ずつ
   - label と prompt のペアで出力
4. 生成結果をプレビュー表示
5. ユーザーが選択・編集 → 保存

**ファイル**: `src/app/api/admin/ai/tags/generate/route.ts`

### 8. Server Actions

**ファイル**: `src/app/(admin)/admin/ai/tags/actions.ts`

```typescript
getTags(filter?: { tag_type?: string; is_active?: boolean })
getTag(id: string)
createTag(data: Omit<AiPromptTag, 'id' | 'created_at' | 'updated_at'>)
updateTag(id: string, data: Partial<AiPromptTag>)
deleteTag(id: string)
reorderTags(updates: Array<{ id: string; order_num: number }>)
```

---

## ファイル構成

```
src/app/(admin)/admin/ai/tags/
├── page.tsx                    # タグ一覧ページ
├── actions.ts                  # Server Actions
└── _components/
    ├── TagList.tsx              # タグ一覧テーブル
    ├── TagForm.tsx              # タグ編集フォーム
    └── TagGenerateDialog.tsx    # AI 一括生成ダイアログ

src/components/ai/
├── ChatTagList.tsx             # チャットページのタグ表示（新規 or Ticket 25 で作成済み）
└── ChatSuggestions.tsx         # 回答内の関連タグ提案（同上）

src/app/api/ai/tags/route.ts    # タグ取得 API
src/app/api/admin/ai/tags/generate/route.ts  # タグ AI 生成 API
```

---

## タグの初期データ例

| label | prompt | tag_type |
|-------|--------|----------|
| ランチを探す | 飯田市でおすすめのランチスポットを教えて | purpose |
| カフェを探す | 飯田・下伊那でゆっくりできるカフェを教えて | purpose |
| イベント情報 | 最近のイベントや催し物の情報を教えて | purpose |
| お土産を探す | 飯田のおすすめのお土産を教えて | purpose |
| 天龍峡 | 天龍峡エリアのおすすめスポットを教えて | area |
| 丘の上 | 丘の上エリアのお店やスポットを教えて | area |
| 遠山郷 | 遠山郷の見どころを教えて | area |
| 子連れで行ける | 子連れで楽しめるスポットを教えて | scene |
| デートにおすすめ | デートにぴったりなお店やスポットを教えて | scene |
| 雨の日でもOK | 雨の日でも楽しめるスポットを教えて | scene |

> 実際の初期タグは AI 一括生成後にライターがレビュー・調整する。

---

## 完了条件

- [ ] GET /api/ai/tags がタグ一覧を返す
- [ ] チャットページにタグが表示される
- [ ] タグクリック → prompt が送信される
- [ ] 回答内に関連タグ提案が表示される
- [ ] 管理画面でタグの CRUD ができる
- [ ] タグの並び替えができる
- [ ] AI 一括生成が動作する
- [ ] `npm run build` が成功する
