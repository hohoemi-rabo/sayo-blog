-- posts に3段階AI要約カラムを追加（すべて NULL 許可・既存記事は要約なし＝公開側で自動非表示）
alter table posts add column if not exists summary_short  text;
alter table posts add column if not exists summary_medium text;
alter table posts add column if not exists summary_long   text;

comment on column posts.summary_short  is 'AI要約（さくっと / 〜150字目安）';
comment on column posts.summary_medium is 'AI要約（ほどよく / 〜400字目安）';
comment on column posts.summary_long   is 'AI要約（じっくり / 〜800字目安）';
