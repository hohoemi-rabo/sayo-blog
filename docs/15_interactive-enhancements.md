# 15: Interactive Enhancements（インタラクティブ機能強化）

## Overview

記事ページのUXを向上させるインタラクティブ機能を実装する。
**Framer Motionは使用しない**。すべてCSS アニメーション + IntersectionObserver + vanilla JSで実装する。

## Related Files

### 新規作成
- `src/lib/article-utils.ts` - HTML見出し抽出・id付与ユーティリティ
- `src/components/ScrollProgress.tsx` - スクロール進捗バー
- `src/components/TableOfContents.tsx` - 目次（スクロール追従）
- `src/components/ImageLightbox.tsx` - 画像ライトボックス
- `src/components/RelatedArticles.tsx` - 関連記事セクション
- `src/components/ReactionBar.tsx` - リアクションボタン
- `src/components/ScrollFadeIn.tsx` - スクロールフェードインラッパー
- `src/app/api/reactions/route.ts` - リアクションAPI

### 変更
- `src/app/(public)/[category]/[slug]/page.tsx` - 全コンポーネントの統合、2カラムレイアウト化
- `src/app/globals.css` - ライトボックス用CSS追加

### DB
- `reactions` テーブル + `increment_reaction_count` RPC関数

## Technical Details

### Technology Stack

- **CSS animations / transitions**: すべてのアニメーション（GPU accelerated）
- **IntersectionObserver**: TOCスクロール追従、フェードインアニメーション
- **vanilla JS scroll event**: スクロール進捗トラッキング
- **`<dialog>` element**: ライトボックスモーダル（ネイティブ）
- **Supabase**: リアクション保存

### 設計方針

- 外部ライブラリ追加なし（バンドルサイズ維持）
- `prefers-reduced-motion` を全アニメーションで尊重
- Server Component を優先、Client Component は最小限
- GPUアクセラレーション（`transform`, `opacity`）を活用

## Todo

### Scroll Progress Bar

- [×] Create ScrollProgress component (`src/components/ScrollProgress.tsx`)
- [×] `'use client'` directive
- [×] `scroll` イベントで `document.documentElement.scrollTop / scrollHeight` を計算
- [×] `requestAnimationFrame` でスムーズ更新
- [×] CSS `transform: scaleX()` でバー幅を制御（GPU accelerated）
- [×] `fixed top-0` + `z-[60]` でビューポート上部に固定（Header z-50 の上）
- [×] プライマリグラデーション適用（`from-primary to-accent-purple`）
- [×] 記事ページのみで表示
- [×] `will-change: transform` でパフォーマンス最適化
- [×] `prefers-reduced-motion` で非表示
- [×] `pointer-events-none` でクリック透過

### Table of Contents

- [×] Create TableOfContents component (`src/components/TableOfContents.tsx`)
- [×] `'use client'` directive
- [×] 記事HTMLから `h2`, `h3` 見出しを抽出（`article-utils.ts`）
- [×] 各見出しにアンカーリンク（`id`）を付与（`processArticleContent`）
- [×] デスクトップ: サイドバーに `sticky` 表示（`w-56`）
- [×] モバイル: 折りたたみドロップダウン（ChevronDown アイコン）
- [×] `IntersectionObserver` で現在のセクションを追跡
- [×] アクティブセクションをハイライト（CSS transition + border-left）
- [×] クリックで `scrollIntoView({ behavior: 'smooth' })` スクロール
- [×] 開閉アニメーション（CSS `grid-template-rows: 0fr → 1fr`）

### Image Lightbox

- [×] Create ImageLightbox component (`src/components/ImageLightbox.tsx`)
- [×] `'use client'` directive
- [×] ネイティブ `<dialog>` 要素を使用（アクセシビリティ対応済み）
- [×] `.article-body` へのイベントデリゲーションで画像クリック検知
- [×] フルサイズ画像をモーダル表示
- [×] 閉じるボタン（X アイコン）
- [×] 前後ナビゲーション矢印（画像が複数の場合）
- [×] キーボード操作（Esc: ネイティブ、← →: ナビゲーション）
- [×] `backdrop-filter: blur()` で背景ぼかし
- [×] CSS `@keyframes` で開閉アニメーション（fade + scale）
- [×] モバイル: タッチスワイプでナビゲーション（`touchstart/touchend`）
- [×] 画像キャプション表示（`figure > figcaption`）
- [×] 画像カウンター表示（1 / N）
- [×] `.article-body img { cursor: zoom-in }` CSS追加

### Related Articles

- [×] Create RelatedArticles component (`src/components/RelatedArticles.tsx`)
- [×] Server Component として実装（データフェッチ）
- [×] 関連度スコアリング:
  - [×] 同カテゴリ（重み: +10）
  - [×] 共通ハッシュタグ数（重み: +3 each）
  - [×] 最終的にスコアでソート
- [×] 最大3件表示
- [×] `PostCard` コンポーネントを再利用
- [×] 記事末尾（`border-t` で区切り）に配置
- [×] モバイル: 横スクロール（`overflow-x-auto`, `snap-x`）
- [×] 候補不足時は最新記事で補完

### Reaction Bar

- [×] Create ReactionBar component (`src/components/ReactionBar.tsx`)
- [×] `'use client'` directive
- [×] 4種のリアクション表示: 💡なるほど / 🩷すき / 👍いいね / 🔥アツい
- [×] 各リアクションのカウント表示
- [×] クリックでカウント増加（Optimistic Update）
- [×] `reactions` テーブルにSupabaseで保存（`increment_reaction_count` RPC）
- [×] `localStorage` でユーザーのリアクション状態を保持（1投稿1リアクションタイプ1回）
- [×] CSS `transition: transform` でクリックアニメーション（scale）
- [×] CSS `:hover` / `:active` でインタラクション
- [×] 記事下部に配置（ArticleMeta の下）
- [ ] Supabase Realtime でリアルタイム更新（optional、未実装）

### Scroll Fade-in Animations

- [×] Create ScrollFadeIn component (`src/components/ScrollFadeIn.tsx`)
- [×] `'use client'` directive
- [×] `IntersectionObserver` でビューポート進入を検知
- [×] `once: true` で一度だけアニメーション（`observer.unobserve`）
- [×] CSS inline style で `opacity: 0 → 1`, `translateY: 20px → 0`
- [×] `transition` プロパティでスムーズ補間
- [×] `prefers-reduced-motion: reduce` でアニメーション無効化
- [×] 適用対象:
  - [×] 関連記事セクション
- [×] `threshold` と `rootMargin` で発火タイミング調整
- [×] `delay` prop でスタッガーアニメーション対応

### Performance Optimization

- [×] `scroll` イベントに `passive: true` オプション
- [×] `requestAnimationFrame` でスクロール処理を最適化
- [×] アニメーションプロパティは `transform`, `opacity` のみ（リフロー回避）
- [×] ビルドエラーなし確認済み

### DB Migration

- [×] `reactions` テーブル作成（UUID PK, post_id FK, reaction_type, count）
- [×] `UNIQUE(post_id, reaction_type)` 制約
- [×] RLS: SELECT全員可、INSERT/UPDATE全員可
- [×] `increment_reaction_count` RPC関数（UPSERT + atomicカウント）
- [×] `idx_reactions_post_id` インデックス

### API Route

- [×] `src/app/api/reactions/route.ts` 作成
- [×] GET: `?postId=xxx` → `{ light: 5, heart: 3, ... }`
- [×] POST: `{ post_id, reaction_type }` → RPC呼び出し
- [×] バリデーション（必須パラメータ、有効なreaction_type）
- [×] エラーハンドリング（try-catch + NextResponse）

### Article Page Integration

- [×] `processArticleContent` で見出しにid付与 + TOCデータ抽出
- [×] レイアウト変更: `max-w-6xl` + `lg:flex lg:gap-8` で2カラム化
- [×] ヒーロー部分は `max-w-4xl` を維持
- [×] モバイルTOC（本文上）+ デスクトップTOC（aside `w-56`）
- [×] 全コンポーネントの組み込み

## References

- [IntersectionObserver API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [HTML dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

## Validation Checklist

- [ ] スクロールプログレスバーが正しく表示・動作する
- [ ] 目次がアクティブセクションを追従する
- [ ] 画像ライトボックスが開閉・ナビゲーションできる
- [ ] 関連記事が関連度順で表示される
- [ ] リアクションボタンがカウント増加する
- [ ] すべてのアニメーションが60fpsで動作する
- [ ] モバイルで全機能が動作する
- [ ] キーボード操作が可能（ライトボックス）
- [ ] `prefers-reduced-motion: reduce` でアニメーション無効化
- [ ] Lighthouse Performance 85以上を維持
- [ ] Framer Motion が新規コンポーネントに含まれていない
- [ ] コンソールエラーなし
