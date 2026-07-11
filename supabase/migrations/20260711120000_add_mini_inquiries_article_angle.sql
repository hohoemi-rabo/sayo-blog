-- 投稿記事の「切り口」(/request/post/guide の診断結果) を依頼に控える。
--
-- 診断 (7 型) を通ってきた人は、どの魅力を前に出したいかを既に選んでいる。
-- その意図を記事化のときに使えるよう、依頼レコードに残す。
-- 診断を通らずフォームへ直行した人も多いので NULL 許容 (必須にしない)。
--
-- CHECK は article-angles.ts の ARTICLE_ANGLES と対応させること。

ALTER TABLE mini_inquiries
  ADD COLUMN IF NOT EXISTS article_angle text;

ALTER TABLE mini_inquiries
  DROP CONSTRAINT IF EXISTS mini_inquiries_article_angle_check;

ALTER TABLE mini_inquiries
  ADD CONSTRAINT mini_inquiries_article_angle_check
  CHECK (
    article_angle IS NULL
    OR article_angle IN (
      'intro',
      'story',
      'lineup',
      'kodawari',
      'atmosphere',
      'anshin',
      'participation'
    )
  );

COMMENT ON COLUMN mini_inquiries.article_angle IS
  '投稿記事の切り口 (/request/post/guide の診断結果)。診断を通らなかった場合は NULL。';
