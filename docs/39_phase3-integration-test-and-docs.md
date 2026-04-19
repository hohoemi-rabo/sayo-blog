# Ticket 39: Phase 3 統合テスト & ドキュメント最終化

> **フェーズ**: Phase 3 仕上げ（最終）
> **依存**: 29, 30, 31, 32, 33, 34, 35, 36, 37, 38
> **ブロック**: なし

---

## 概要

Phase 3 全機能（3A / 3B / 3C）の統合動作確認を行い、CLAUDE.md・SPEC-FULL.md・実装状況ドキュメントを Phase 3 完了状態に更新する。
手動 E2E シナリオを実行し、発見した不具合はこのチケット内で修正するか、新規チケットに切り出す。

---

## 実装内容

### 1. 統合テスト（手動 E2E）

以下シナリオを本番相当環境（または Supabase ブランチ）で順に実行し、結果を記録する。

#### 1.1 Phase 3A: ブログ → Instagram

- [ ] **T1**: 記事を新規作成・公開 → 自動で IG 下書きが 1 件生成される
- [ ] **T2**: `/admin/instagram/posts` で下書きが表示される
- [ ] **T3**: 「追加生成」で 3 件追加生成 → 連番 2/4, 3/4, 4/4 で保存される
- [ ] **T4**: 編集ダイアログで caption / hashtags / image_url を変更・保存できる
- [ ] **T5**: 「コピー」でクリップボードにキャプション + ハッシュタグが入る
- [ ] **T6**: 「手動投稿済み」ボタンで status が更新される
- [ ] **T7**: 「Instagram ログイン」→ `@fune.iida.toyooka.odekake` に接続できる
- [ ] **T8**: 「🚀 Instagram に投稿」で実際に IG に投稿される（テスト用ダミー記事）
- [ ] **T9**: 投稿後に `instagram_media_id` と `instagram_published_at` が保存されている
- [ ] **T10**: トークン期限切れ時に再ログイン案内が表示される
- [ ] **T11**: 記事編集画面に「📷 Instagram 投稿」セクションが表示される

#### 1.2 Phase 3B: Instagram → ブログ

- [ ] **T12**: `/admin/instagram/sources` で新規アカウント登録（許可状態=approved + active=true）
- [ ] **T13**: 「今取得」で最新投稿が取得される（Bright Data 経由）
- [ ] **T14**: 同じ投稿を再取得しても ON CONFLICT で重複が INSERT されない
- [ ] **T15**: 未許可アカウントに対して「今取得」ボタンが無効化されている
- [ ] **T16**: `/admin/instagram/imports` で取得投稿一覧が表示される
- [ ] **T17**: フィルター（status / source_id / q / sort）が動作する
- [ ] **T18**: 「🤖 記事化する」で AI 記事が生成され、記事編集画面へ遷移する
- [ ] **T19**: 生成記事に画像が保存され（`ig-imported` バケット）、サムネイルが設定されている
- [ ] **T20**: 生成記事の末尾にクレジット表記（display_name + @ig_username + 元 URL）が含まれている
- [ ] **T21**: 生成記事は `is_published=false` で下書き状態
- [ ] **T22**: 「スキップ」「未処理に戻す」が動作する
- [ ] **T23**: 生成済み記事を開くと「📥 元 Instagram 投稿」セクションが表示される
- [ ] **T24**: 情報量不足の投稿（caption 空 + 画像なし）で「記事化する」を押すと 400 エラーが表示される

#### 1.3 Phase 3C: 認証

- [ ] **T25**: `/admin/login` で「Google でログイン」のみ表示される
- [ ] **T26**: 許可メール（紗代・まさゆき）でログインできる
- [ ] **T27**: 未許可メールでログインするとエラーが表示される
- [ ] **T28**: 別ブラウザで同時ログインできる（JWT なので制約なし）
- [ ] **T29**: ログアウトで session が消え、`/admin/*` にアクセスすると login へリダイレクト
- [ ] **T30**: 旧 `admin_auth` cookie が存在しても無視される
- [ ] **T31**: `/api/admin/*` と `/api/instagram/*` が未認証時に 401 を返す

### 2. ドキュメント更新

#### 2.1 `CLAUDE.md`

- 「Tech Stack」に Facebook Graph API, NextAuth.js, Bright Data（or 採用サービス）を追記
- 「URL Structure」に `/admin/instagram/posts`, `/admin/instagram/sources`, `/admin/instagram/imports` を追記
- 「Environment Variables」を Phase 3 向けに更新（`ADMIN_PASSWORD` を削除、OAuth / FB / Bright Data 変数を追加）
- 「Rules Directory」に Instagram 関連の新ルールがあれば追記

#### 2.2 `.claude/rules/implementation-status.md`

Phase 3 チケット完了リストを追加:

```markdown
### Phase 3 — Completed
- Ticket 29: Phase 3 共通基盤
- Ticket 30: ブログ→IG AI キャプション生成
- Ticket 31: IG 投稿管理 CRUD
- Ticket 32: 自動下書き生成 + 記事編集画面統合
- Ticket 33: Graph API 直接投稿
- Ticket 34: IG 取得先アカウント管理
- Ticket 35: 外部データ取得サービス連携
- Ticket 36: 取得投稿管理画面
- Ticket 37: AI 記事再構成
- Ticket 38: NextAuth.js v5 Google OAuth 移行
- Ticket 39: 統合テスト & ドキュメント最終化
```

Key File Map に Phase 3 追加ファイルを追記（主要ファイルのみ）。

#### 2.3 `docs/SPEC-FULL.md`

Phase 3 完了後の完全仕様書に更新:
- **2. URL 構造**: `/admin/instagram/*` を追加
- **5. コンポーネント一覧**: Instagram 連携コンポーネント節を追加
- **6. API ルート**: 3.2 に Instagram 管理 API を追加
- **7. データベーススキーマ**: 4 テーブル（ig_posts, ig_sources, ig_imported_posts, ig_settings）を追加
- **9. RLS ポリシー**: 新規 4 テーブルのポリシーを記載
- **14. 認証 & セキュリティ**: NextAuth.js v5 + Google OAuth + ホワイトリストに更新
- **15. 環境変数**: Phase 3 で追加された変数を反映
- **17. 管理パネル機能**: Instagram 連携セクション（IG 投稿管理 / 取得先アカウント / 取得投稿）を追加
- **18. Supabase プロジェクト情報**: Storage バケットに `ig-posts` / `ig-imported` を追加
- ヘッダーの「ステータス」を「Phase 1 + Phase 2 + Phase 3 完了」に変更

#### 2.4 `.claude/rules/admin.md`

Instagram 連携関連のパターン・既知の問題があれば追記:
- Instagram 投稿ボタンの Graph API エラーハンドリングパターン
- FB SDK 読み込みのタイミング（Client Component 必須）

#### 2.5 `.claude/rules/database.md`

- Phase 3 の 4 テーブルを「Core Tables」に追加
- `ig_posts.sequence_number` のユニーク制約運用
- Storage バケットの追加を反映

#### 2.6 `README.md`（必要に応じて）

セットアップ手順に以下を追記:
- Facebook App の作成手順
- Google Cloud OAuth 設定手順
- Bright Data（or 採用サービス）の API トークン取得手順

### 3. 不具合修正

統合テストで発見した不具合を本チケット内で対応する。以下の規模を超える場合は新規チケット化する。

- 軽微なバグ / タイポ / 文言修正 → 本チケット内
- 機能追加・設計変更が必要な修正 → 新規チケット

### 4. パフォーマンス・セキュリティ確認

- [ ] **P1**: Lighthouse スコアが Phase 2 時点から大きく低下していない（管理画面は対象外、パブリック側のみ）
- [ ] **P2**: `npm run build` のバンドルサイズが Phase 2 時点と比較して妥当範囲
- [ ] **S1**: Graph API トークンが暗号化されて DB に保存されている
- [ ] **S2**: Google OAuth のホワイトリストが正しく機能している
- [ ] **S3**: Bright Data API トークンがクライアント側に露出していない
- [ ] **S4**: IG Storage バケットの RLS / Policy が認証ユーザーのみ upload 可能
- [ ] **S5**: 未許可 IG アカウントの投稿を取得できない（permission_status='approved' チェック）

### 5. 運用ガイド作成（オプション）

紗代さん向けの運用手順書を `docs/phase3-operation-guide.md` に作成:
- ブログ→IG の推奨フロー
- IG→ブログの推奨フロー
- 記事化された下書きのチェックポイント
- トラブル時の連絡先

※ 本チケットのスコープに含めるかは完了時に判断。

---

## ファイル構成

```
CLAUDE.md                                # 編集
.claude/rules/implementation-status.md   # 編集
.claude/rules/admin.md                   # 編集
.claude/rules/database.md                # 編集
docs/SPEC-FULL.md                        # 編集
README.md                                # 編集（必要に応じて）
docs/phase3-operation-guide.md           # 新規（オプション）
```

---

## 完了条件

- [ ] Phase 3A 統合テスト T1〜T11 が全て Pass
- [ ] Phase 3B 統合テスト T12〜T24 が全て Pass
- [ ] Phase 3C 統合テスト T25〜T31 が全て Pass
- [ ] パフォーマンス / セキュリティ確認 P1〜P2, S1〜S5 が全て Pass
- [ ] `CLAUDE.md` が Phase 3 完了状態に更新されている
- [ ] `.claude/rules/implementation-status.md` に Phase 3 チケット完了リストが追加されている
- [ ] `docs/SPEC-FULL.md` が Phase 3 完了状態に更新されている
- [ ] `.claude/rules/admin.md` と `.claude/rules/database.md` が更新されている
- [ ] 統合テストで発見された不具合が解消（または新規チケット化）されている
- [ ] `npm run build` が成功し、Lighthouse スコア低下が軽微である
- [ ] 最終 commit のメッセージが conventional commit 形式
