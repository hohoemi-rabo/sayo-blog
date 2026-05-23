# Phase 4 着手前バックアップ — 削除する IG 取り込みテストデータ

**取得日**: 2026-05-23
**目的**: Ticket 40 で `ig_sources` / `ig_imported_posts` テーブルを DROP し、`ig-imported`
バケットと関連下書き記事 2 件を削除する前の控え。全てテストデータ（公開記事ゼロ）。

復元が必要になった場合はこの内容を元に再 INSERT する。`search_vector` は generated 列のため省略。

---

## ig_sources（1 件）

| 列 | 値 |
|----|----|
| id | `8dfd7db3-1689-4959-8680-e81e78bab859` |
| ig_username | `mutosu_iida` |
| display_name | ムトス飯田の市民活動ひろば |
| category_slug | event |
| permission_status | approved |
| permission_date | 2026-04-27 |
| permission_memo | DM 経由で許可 |
| contact_info | SMS |
| is_active | true |
| last_fetched_at | 2026-05-05T10:29:37.572+00:00 |

## ig_imported_posts（5 件）

| ig_post_id | status | generated_post_id | stored_image_urls |
|------------|--------|-------------------|-------------------|
| DQYZj7KEYja | pending | null | ig-imported/mutosu_iida/image_3.jpg |
| DQTO8RdkZyh | pending | null | ig-imported/mutosu_iida/image_4.jpg |
| DPKu4OFgT3P | pending | null | ig-imported/mutosu_iida/image_5.jpg |
| DRivsseD89S | published | 7a008cf2-... | ig-imported/mutosu_iida/image_1.jpg |
| DQv1uN9kZu_ | published | 16dad9a4-... | ig-imported/mutosu_iida/image_2.jpg |

source_id は全件 `8dfd7db3-1689-4959-8680-e81e78bab859`。
caption / likes_count / ig_posted_at の完全な値は git 履歴のこのコミットの会話ログ参照。
（5 投稿とも「ムトス飯田」の市民活動講座の告知。元 URL は `https://www.instagram.com/p/{ig_post_id}/`）

## 削除する下書き記事（2 件、is_published=false）

| id | title | slug |
|----|-------|------|
| 7a008cf2-a372-41d2-8c85-62300c290033 | 12/8(月)開催！【飯田市】地域活動の資金調達を学ぶスキルアップ講座が開催されます | event-2025-12-08-... |
| 16dad9a4-4e2f-4c95-85e5-6d97cbf29b49 | 【飯田市】11/20開催！活動の魅力を24時間発信。初心者歓迎の「ホームページ開設講座」 | event-2025-11-20-... |

両記事とも `ig-imported` バケットの画像を thumbnail / 本文で参照。is_event=true。
（Ticket 37 の動作確認で生成したテスト記事。公開されていない）

## ig-imported バケット内ファイル

```
ig-imported/mutosu_iida/image_1.jpg
ig-imported/mutosu_iida/image_2.jpg
ig-imported/mutosu_iida/image_3.jpg
ig-imported/mutosu_iida/image_4.jpg
ig-imported/mutosu_iida/image_5.jpg
```
