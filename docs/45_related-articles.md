# Ticket 45: 関連記事 — 自動選定の改善 + 手動で選べるようにする

## 概要

記事ページ下部の「関連記事」(3 件) を、

1. **紗代さんが記事ごとに手動で選べる** (最大 3 件) ようにし、
2. 選ばなかった枠は **改善した自動選定** で埋める

形にする。一般的なブログ・ニュースサイトでよくある「手動 + 自動の組み合わせ」。
2026-10-31 に紗代さん (オーナー経由) と方向性を合意済み。実装は別セッションで行う。

## 現状 (2026-10-31 調査)

実装: `src/components/RelatedArticles.tsx` (Server Component, 記事ページ `[category]/[slug]/page.tsx` の下部で `<Suspense>` + `ScrollFadeIn` 内)。記事ページは ISR 3600s。

今の決め方:
1. 同じカテゴリの記事 id を `post_categories` から取得 (並び順の指定なし)。10 件未満なら新しい記事で補完
2. **先頭 20 件だけ**を候補にする
3. スコア: 同カテゴリ +10、共通ハッシュタグ 1 つにつき +3
4. 上位 3 件

問題点 (本番データで確認):

| 問題 | 内容 |
|---|---|
| ① 候補 20 件が恣意的 | 「食・グルメ」は公開 35 件。20 件に切る順が DB 任せ (新しい順でも関連順でもない) → **一度も関連記事に出ない記事がある** |
| ② 同点が多く毎回同じ 3 件 | ハッシュタグは 1 記事平均 **1.1 個** でスコア差がほぼ付かない。同点の並びも DB 任せ |
| ③ 終了イベントが出る | 「イベント・講座」の公開 25 件は **全部 `event_ended=true`**。イベント記事の関連記事が白黒の「終了」カードばかりになる |

カテゴリ別の公開記事数: food 35 / event 25 (全部終了) / outing 18 (終了 1) / life 10 / culture 7 / people 2。

## 決定事項

| 項目 | 決定 |
|---|---|
| 件数 | 3 件 (今と同じ) |
| 手動選択 | 記事編集画面で **最大 3 件**、選んだ順に表示 |
| 手動が 3 件未満のとき | 残りの枠を自動選定で埋める |
| 手動で何も選ばない記事 | 全部自動 (既存 97 件はこのままで困らない) |
| 自動の候補 | 同じカテゴリの**公開記事を全部** (20 件で切らない)。**終了イベントは除く**。自分自身・手動で選んだ記事も除く |
| 自動の並び | 共通ハッシュタグが多い順 → **同点なら公開日が新しい順** (ランダムにはしない) |
| 同カテゴリで足りないとき | ほかのカテゴリの新しい記事 (終了イベント除く) で埋める |
| 手動で選んだ記事が後で非公開 / 終了イベントになったら | **表示時に自動で外し**、空いた枠は自動選定で埋める (選択自体は DB に残してよい) |

## 設計案

### DB (migration が必要 = 本番 DB に適用)

新テーブル `post_related_posts`:

| カラム | 型 | 備考 |
|---|---|---|
| `post_id` | uuid | FK → posts.id, ON DELETE CASCADE |
| `related_post_id` | uuid | FK → posts.id, ON DELETE CASCADE (関連先の記事を消したら選択も消える) |
| `position` | smallint | 0〜2。表示順 |
| `created_at` | timestamptz | default now() |

- PK `(post_id, related_post_id)` / UNIQUE `(post_id, position)` / CHECK `post_id <> related_post_id` / CHECK `position between 0 and 2`
- **RLS**: 公開側 (`RelatedArticles` は anon の `createClient()`) が読めるよう SELECT を許可。書き込みは管理画面の `createAdminClient()` (service role) のみ。既存テーブル (`post_hashtags` 等) の RLS 方針に揃えること (`.claude/rules/database.md` 参照)
- 既存データには触れない (新テーブルを足すだけ)

### 管理画面

- `PostForm.tsx` のサイドバーに「関連記事」カード。**タイトルで検索 → 最大 3 件選ぶ / 並べ替え / 外す**
  - 検索は Server Action (`assertAdminAuth` 付き)。自分自身は候補から除く。下書き・終了イベントも選べてよいが、バッジで「下書き」「終了」と分かるように (表示時は外れる旨を説明)
  - 何も選ばなければ「自動で選ばれます」と表示
- 保存は `createPost` / `updatePost` (`src/app/(admin)/admin/posts/actions.ts`) に `related_post_ids: string[]` を足し、delete → insert (post_hashtags と同じやり方)
- 編集画面を開いたときに既存の選択を読み込む (`getPost` の select に含めるか別関数)

### 公開側

- `RelatedArticles.tsx` を書き換え:
  1. 手動選択を `position` 順に取得 → 公開中 かつ `event_ended=false` のものだけ残す
  2. 足りない分を自動選定 (上の決定事項どおり)。候補取得は「同カテゴリの公開・非終了記事」を 1 クエリで (`post_categories!inner` で絞る)。本文 (`content`) まで全件取ると重いので、スコア計算用は id・published_at・ハッシュタグだけ取り、当選した記事だけカード用に本体を取る (`src/lib/home-posts.ts` の 2 段階取得と同じ考え方)
  3. 足りなければ他カテゴリの新しい記事で補完
- 記事保存時に `revalidatePath` で該当記事ページを更新 (今の `updatePost` は `/` `/admin/posts` 等のみ。記事の公開 URL `/{category}/{slug}` も足す。slug は日本語のことがある = `encodeURIComponent` に注意)
- ロジックは純粋関数に切り出して `node --test` でテスト (`src/lib/post-images.test.ts` が先例。tsconfig の build 対象からは除外する点も同じ)

## 注意 (この環境の落とし穴)

- **ローカル dev も本番 DB**。管理画面で保存ボタンを押すと本番の記事が変わる。確認は playwright で POST を止めて画面だけ見る (`memory: local-dev-hits-prod-db` / `visual-check-playwright`)
- **ユーザーの `next dev` 稼働中に `npm run build` しない** (.next が壊れる)。tsc + lint + dev への curl で確認
- migration は本番 DB に直接効く。適用前にオーナーに確認する

## 完了条件

- [ ] migration `post_related_posts` (+ RLS) を作成し、本番 DB に適用
- [ ] 記事編集画面に「関連記事」選択 UI (検索・最大 3 件・並べ替え・外す)
- [ ] `createPost` / `updatePost` で保存、編集画面で既存の選択を読み込む
- [ ] `RelatedArticles` を「手動 → 自動で補完」に書き換え (終了イベント除外・全候補・同点は新しい順・他カテゴリ補完)
- [ ] 選定ロジックの単体テスト (手動のみ / 手動 + 自動 / 手動の記事が非公開・終了 / 同カテゴリ不足 / イベント・講座のように全部終了)
- [ ] 記事保存時に記事ページを revalidate
- [ ] 画面確認 (375px / 1280px、イベント記事・食グルメ記事・人・活動 (2 件しかない) 記事)
- [ ] ドキュメント更新 (`.claude/rules/implementation-status.md` / `admin.md` / `database.md` / CLAUDE.md の Updated)
