# docs ディレクトリの歩き方

このフォルダには、Sayo's Journal の**仕様書・要件定義・チケット（作業単位）の記録**が入っています。
ファイルが増えてきたので、まずこの README で「どれを見ればよいか」を確認してください。

---

## 🧭 まず見るべきもの（現行の正）

| ファイル | 役割 |
|---------|------|
| [`SPEC-FULL.md`](./SPEC-FULL.md) | **完全仕様書（現行）**。URL / DB / API / コンポーネント / 環境変数など実装の全体像。迷ったらまずここ。 |
| [`../.claude/rules/implementation-status.md`](../.claude/rules/implementation-status.md) | **実装状況とファイルマップ（現行）**。どのチケットが完了/廃止/未着手か、どのファイルが何をするか。 |
| [`../CLAUDE.md`](../CLAUDE.md) | プロジェクト概要・開発コマンド・規約。 |
| [`../.claude/rules/*.md`](../.claude/rules/) | 領域別ルール（frontend / admin / database / instagram / nextjs-patterns）。作業時に自動参照される。 |

> SPEC-FULL.md と implementation-status.md が「現在こうなっている」の正本。
> 下記の Phase 要件定義やチケットは「当時こう決めた」の記録（歴史）です。

---

## 📁 ファイルの分類

### 1. 現行ドキュメント
- `SPEC-FULL.md` — 完全仕様書（最新）
- `vision-notes.md` — プロジェクトの想いメモ（ミニ記事「点と点を線で結ぶ」など）
- `iida-business-plan-entry.md` — 飯田市ビジネスプランコンペ応募ドラフト

### 2. 初期 Phase 要件定義（歴史的記録 / 冒頭に注記あり）
- `Phase1_SPECIFICATION.md` — Phase 1（ブログ基盤 + 管理画面 + SEO）
- `Phase2-requirements.md` — Phase 2（AI Chat）
- `Phase3-requirements.md` — Phase 3（Instagram 連携。Phase 3B は廃止）

### 3. チケット（作業単位の記録）`NN_*.md`
番号は作業順。完了状況は implementation-status.md が正。欠番（16 / 18 / 19）あり。

| 範囲 | フェーズ | 状態 |
|------|---------|------|
| 01〜12, 17 | Phase 1（ブログ基盤 + 管理画面 + SEO） | ✅ 完了 |
| 13〜15 | テスト / デプロイ / インタラクティブ強化 | ✅ 完了（13/14 は手順記録） |
| 20〜28 | Phase 2（AI Chat） | ✅ 完了 |
| 29〜32, 37 | Phase 3（ブログ→IG, AI 記事再構成） | ✅ 完了 |
| 33 | Graph API 直接投稿 | ⏸ 保留 |
| 34〜36 | Cowork CSV 取り込み | ❌ 廃止（Phase 4 に置換） |
| 38〜39 | NextAuth 移行 / 統合テスト | ⬜ 未着手 |
| 40〜42 | Phase 4（情報窓口フォーム = 3つの柱） | ✅ 完了 |

---

## ✍️ 運用メモ

- 新しい作業をチケット化する場合は `NN_xxx.md`（数字プレフィックス）で追加する（CLAUDE.md の規約）。
- チケット内の Todo は `- [ ]`（未）/ `- [×]`（完了・全角×）で管理する。
- 仕様が変わったら **SPEC-FULL.md と implementation-status.md を更新**する（チケットファイルは当時の記録として残す）。
