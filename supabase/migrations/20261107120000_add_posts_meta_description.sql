-- 検索結果 (Google) 用の説明文を、記事カードの「抜粋」とは別に書けるようにする。
-- NULL / 空なら公開側は従来どおり抜粋 → タイトルを使うので、既存記事は何もしなくてよい。
ALTER TABLE posts ADD COLUMN IF NOT EXISTS meta_description text;

COMMENT ON COLUMN posts.meta_description IS
  '検索結果用の説明文 (meta description / og:description)。空なら excerpt を使う';
