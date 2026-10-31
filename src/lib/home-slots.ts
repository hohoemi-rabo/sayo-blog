/**
 * トップページの枠の数 (Server / Client 両用)。
 * ★ (posts.is_featured) は Pick Up に載せる記事の印なので、★の上限 = Pick Up の枠数。
 * 管理画面の記事一覧 (★の件数表示・上限チェック) と getHomePosts() で共有する。
 */
export const PICKUP_COUNT = 6
