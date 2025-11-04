# 📝 Sayo's Journal 開発要件定義書 v1.0

**VibeCoding 開発用 / Phase1・Phase2 構成**

---

## 第 1 章　プロジェクト概要

### 1.1 　プロジェクト名

**「Sayo's Journal」**  
― 言葉で"場所・人・記憶"をつなぐブログメディア ―

### 1.2 　目的

ライター・インタビュアーである本岡紗代氏（sayo-kotoba.com）の世界観を Web 上で再構築し、「文章 × 写真 × 体験」を通して、読者に"物語を感じさせるブログサイト"を構築する。

**既存 80 記事のマイグレーション**を前提とし、Supabase によるデータ管理で拡張性と保守性を確保する。

### 1.3 　開発フェーズ構成

| フェーズ    | 内容                                                     | 期間目安 |
| ----------- | -------------------------------------------------------- | -------- |
| **Phase 1** | コア機能実装（トップページ、フィルター、記事表示）       | 2-3 週間 |
| **Phase 2** | インタラクション強化（スクロール進行、目次、関連記事等） | 1-2 週間 |

---

## 第 2 章　デザインコンセプト

### 2.1 　全体テーマ

**「詩的サイケデリック × 装飾的ナラティブ」**

紗代氏が愛好する 5 人のアーティストの美学を融合：

- **ピーター・マックス**のビビッドな色彩とコズミックな世界観
- **ヴィクター・モスコソ**の強烈なコントラストと視覚錯視
- **オーブリー・ビアズリー**の装飾的な線と流麗な曲線
- **ルネ・マグリット**の詩的な余白と意外性
- **ミレー《オフィーリア》**の自然への細密描写と幻想性

### 2.2 　方向性キーワード

- **ビビッドでありながら上品** - サイケデリックな鮮やかさと装飾的な繊細さの両立
- **線と色の調和** - モノクロームの装飾線画 × 鮮やかなカテゴリカラー
- **自然と幻想の交差** - ラファエル前派的な自然観察と非日常的な構成
- **動きと静けさ** - サイケデリックな動的要素と詩的な静的空間
- **物語を感じさせる細部** - 細密描写による没入感

---

## 第 3 章　デザイン要件

### 3.1 　デザインインスピレーション

本サイトのデザインは、紗代氏が愛好する以下のアーティストの美学から着想を得る：

| アーティスト               | 画風の特徴                                                         | サイトへの反映                                     |
| -------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| **ピーター・マックス**     | サイケデリック、ビビッドな色彩、コズミックなスタイル、ポップアート | 大胆な色使い、グラデーション、動きのあるモーション |
| **ヴィクター・モスコソ**   | 強烈な色彩コントラスト、写真コラージュ、視覚錯視                   | カテゴリー間の鮮やかな色の対比、レイヤード効果     |
| **オーブリー・ビアズリー** | モノクロームの装飾的な線画、アールヌーボー、流麗な曲線             | 繊細な装飾パターン、有機的な曲線要素               |
| **ルネ・マグリット**       | シュルレアリスム、日常と非日常の融合、詩的なタイトル               | 意外性のある構成、哲学的な余白                     |
| **ミレー《オフィーリア》** | ラファエル前派、自然への忠実さ、細密描写、幻想的                   | 写真の丁寧な扱い、自然モチーフ、物語性             |

### 3.2 　デザインコンセプト（改訂版）

**「詩的サイケデリック × 装飾的ナラティブ」**

- **ビビッドでありながら上品**：サイケデリックな色彩感覚を持ちつつ、ビアズリーの繊細さで洗練
- **線と色の対比**：モノクロームの装飾的な線画要素 × 鮮やかなカテゴリカラー
- **自然への敬意**：ラファエル前派的な自然観察、細部への丁寧さ
- **非日常の余白**：マグリット的な詩的な空間、意外性のあるレイアウト

### 3.3 　カラーパレット（Tailwind 準拠）

#### 基本色

| 用途                  | 色コード  | 説明                                 |
| --------------------- | --------- | ------------------------------------ |
| **Primary**           | `#FF6B9D` | ビビッドなローズ（サイケデリック的） |
| **Primary Hover**     | `#FF8FB3` | ホバー時明るく                       |
| **Background**        | `#FAF8F5` | 柔らかなオフホワイト                 |
| **Background Dark**   | `#2D2B29` | 深いチャコール（アクセント用）       |
| **Text Primary**      | `#1A1816` | リッチブラック                       |
| **Text Secondary**    | `#6B6865` | ミディアムグレー                     |
| **Accent Turquoise**  | `#4ECDC4` | ターコイズ（コズミック感）           |
| **Accent Purple**     | `#9B59B6` | パープル（ミステリアス）             |
| **Border Decorative** | `#D4C5B9` | 装飾的な境界線                       |

#### カテゴリ別カラー設計（ビビッドグラデーション）

| カテゴリ           | メインカラー | グラデーション      | 用途                   |
| ------------------ | ------------ | ------------------- | ---------------------- |
| **人と暮らし**     | `#E8A87C`    | `#E8A87C → #F5C794` | タグ・カードアクセント |
| **食と時間**       | `#FFB75E`    | `#FFB75E → #FFD194` | 同上                   |
| **風景とめぐり**   | `#4FC3F7`    | `#4FC3F7 → #81D4FA` | 同上                   |
| **旅と出会い**     | `#5C6BC0`    | `#5C6BC0 → #7986CB` | 同上                   |
| **伝統と手しごと** | `#8D6E63`    | `#8D6E63 → #A1887F` | 同上                   |
| **自然と暮らす**   | `#66BB6A`    | `#66BB6A → #81C784` | 同上                   |
| **言葉ノート**     | `#AB47BC`    | `#AB47BC → #BA68C8` | 同上                   |

### 3.4 　フォントシステム

| 用途                   | フォント                             | 備考                           |
| ---------------------- | ------------------------------------ | ------------------------------ |
| **見出し／タイトル**   | Playfair Display, Cormorant Garamond | セリフ体、ビアズリー的な装飾性 |
| **本文（和文）**       | Noto Serif JP, 游明朝体              | 可読性と温もり                 |
| **UI・ナビゲーション** | Noto Sans JP                         | クリーンでモダン               |
| **装飾テキスト**       | Raleway, Quicksand                   | サイケデリック的な軽やかさ     |

### 3.5 　ビジュアルスタイル

#### 装飾要素

- **ビアズリー風装飾**：ヘッダー・フッターに流麗な曲線の SVG パターン
- **サイケデリックグラデーション**：カードホバー時にグラデーション表示
- **視覚錯視効果**：モスコソ風の色彩コントラストを控えめに活用

#### レイアウト

- **非日常の余白**：マグリット的な余白の使い方、意外性のある配置
- **細密と大胆の対比**：細かい装飾 × 大きな余白
- **カードデザイン**：角丸 `rounded-xl` + グラデーションシャドウ

#### 写真の扱い

- **ラファエル前派的アプローチ**：自然光を活かした写真、細部まで丁寧に
- **コラージュ効果**：モスコソ風の多層レイヤー表示（Phase2）
- **カラーフィルター**：カテゴリごとに微細なカラートーン調整

#### アニメーション

- **カードホバー**：`scale: 1.03` + グラデーションシフト（サイケデリック風）
- **スクロール演出**：ゆったりとした視差効果（コズミック感）
- **装飾線の動き**：SVG 装飾がわずかに波打つアニメーション（Phase2）

### 3.6 　アイコン・グラフィック要素

- **アイコン**：Lucide Icons をベースに、一部カスタマイズ
- **装飾パターン**：ビアズリー風の有機的曲線を SVG で実装
- **区切り線**：単純な直線ではなく、装飾的な波線や蔦模様

### 3.7 　デザイン実装の優先順位

**Phase1**

- カテゴリ別グラデーションカラー
- 基本的なカードホバーアニメーション
- 装飾的なヘッダー・フッター

**Phase2**

- SVG 装飾パターンのアニメーション
- 写真のコラージュ効果
- 視覚錯視を活用したインタラクション

---

## 第 4 章　機能要件（Phase1）

### 4.1 　トップページ（カード＋フィルター）

#### 構成

```
Header（ロゴ・ナビ・検索バー）
    ↓
HeroSection（メインビジュアル・サイト説明）
    ↓
FilterBar（地域カテゴリ・ハッシュタグ・並び替え）
    ↓
Card Grid（記事カード一覧）
    ↓
Pagination
    ↓
PopularHashtags（人気ハッシュタグクラウド）
    ↓
Footer
```

#### 主な機能

| 機能                       | 内容                         | 技術                                                      |
| -------------------------- | ---------------------------- | --------------------------------------------------------- |
| **地域フィルター**         | 都道府県別表示切替           | URL パラメータ `/nagano/` または `?prefecture=nagano`     |
| **カテゴリフィルター**     | 市町村レベルでの絞り込み     | `?category=iida`                                          |
| **ハッシュタグフィルター** | 複数ハッシュタグでの絞り込み | `?hashtags=飯田りんご,りんご狩り`                         |
| **ソート**                 | 新着順・人気順（PV 数）      | Supabase ORDER BY                                         |
| **カードアニメーション**   | ホバー時の scale/shadow 変化 | Framer Motion                                             |
| **検索**                   | タイトル・本文全文検索       | Supabase Full-Text Search                                 |
| **レスポンシブ**           | 1〜3 列グリッド              | Tailwind Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| **ページネーション**       | 12 記事/ページ               | URL パラメータ `?page=n`                                  |

#### UI コンポーネント

**基本コンポーネント:**

- `<Header />` - ロゴ、グローバルナビ、検索バー
- `<HeroSection />` - メインビジュアル、キャッチコピー
- `<FilterBar />` - 地域・カテゴリ・ハッシュタグフィルター、ソート切替
- `<PostCard />` - 記事カード（サムネイル、タイトル、カテゴリ、ハッシュタグ、日付）
- `<Pagination />` - ページネーション
- `<PopularHashtags />` - 人気ハッシュタグクラウド
- `<Footer />` - フッター（サイトマップ、SNS リンク）

**PostCard の構成:**

```tsx
<PostCard>
  <Thumbnail image={post.thumbnail_url} />
  <CategoryBadge category={post.categories[0]} /> {/* 都道府県 */}
  <Title>{post.title}</Title>
  <Excerpt>{post.excerpt}</Excerpt>
  <HashtagList hashtags={post.hashtags.slice(0, 3)} />
  <Meta>
    <PublishDate date={post.published_at} />
    <ViewCount count={post.view_count} />
  </Meta>
</PostCard>
```

#### フィルター動作の詳細

**URL 構造とフィルターの関係:**

| URL                              | 表示内容         | 説明                   |
| -------------------------------- | ---------------- | ---------------------- |
| `/`                              | 全記事           | トップページ、新着順   |
| `/nagano/`                       | 長野県の記事     | 長野県カテゴリの全記事 |
| `/nagano/?category=iida`         | 飯田市の記事     | 長野県 > 飯田市の記事  |
| `/hashtags/飯田りんご/`          | ハッシュタグ別   | #飯田りんご の記事     |
| `/?hashtags=りんご狩り,秋の信州` | 複数ハッシュタグ | 両方のタグを持つ記事   |
| `/nagano/?sort=popular`          | 人気順           | 長野県の人気記事       |

**FilterBar の実装イメージ:**

```tsx
<FilterBar>
  {/* 地域セレクト */}
  <Select onChange={handlePrefectureChange}>
    <option value="">全ての地域</option>
    <option value="nagano">長野県</option>
    <option value="tokyo">東京都</option>
  </Select>

  {/* ハッシュタグ検索 */}
  <HashtagInput
    placeholder="#ハッシュタグで検索"
    onSelect={handleHashtagSelect}
    suggestions={popularHashtags}
  />

  {/* ソート */}
  <SortSelect onChange={handleSortChange}>
    <option value="latest">新着順</option>
    <option value="popular">人気順</option>
  </SortSelect>
</FilterBar>
```

#### データ取得ロジック（例）

```typescript
// app/[prefecture]/page.tsx
export async function generateStaticParams() {
  const { data: categories } = await supabase
    .from('categories')
    .select('slug')
    .is('parent_id', null); // 都道府県のみ

  return (
    categories?.map((cat) => ({
      prefecture: cat.slug,
    })) || []
  );
}

export default async function PrefecturePage({
  params,
  searchParams,
}: {
  params: { prefecture: string };
  searchParams: {
    category?: string;
    hashtags?: string;
    sort?: string;
    page?: string;
  };
}) {
  const page = parseInt(searchParams.page || '1');
  const limit = 12;
  const offset = (page - 1) * limit;

  // 基本クエリ
  let query = supabase
    .from('posts')
    .select(
      `
      *,
      post_categories!inner(
        categories!inner(slug, name, parent_id)
      ),
      post_hashtags(
        hashtags(name, slug)
      )
    `
    )
    .eq('is_published', true)
    .eq('post_categories.categories.slug', params.prefecture);

  // 市町村フィルター
  if (searchParams.category) {
    query = query.eq('post_categories.categories.slug', searchParams.category);
  }

  // ハッシュタグフィルター
  if (searchParams.hashtags) {
    const hashtags = searchParams.hashtags.split(',');
    query = query.in('post_hashtags.hashtags.slug', hashtags);
  }

  // ソート
  if (searchParams.sort === 'popular') {
    query = query.order('view_count', { ascending: false });
  } else {
    query = query.order('published_at', { ascending: false });
  }

  // ページネーション
  const { data: posts, count } = await query.range(offset, offset + limit - 1);

  return (
    <div>
      <FilterBar prefecture={params.prefecture} />
      <PostGrid posts={posts} />
      <Pagination
        currentPage={page}
        totalPages={Math.ceil((count || 0) / limit)}
      />
    </div>
  );
}
```

### 4.2 　記事ページ（基本表示）

#### 構成

```
HeroSection（タイトル・OG画像・日付・カテゴリ）
    ↓
ArticleBody（本文）
    ↓
Footer
```

#### 主な機能

| 機能                 | 内容                          |
| -------------------- | ----------------------------- |
| **マークダウン表示** | HTML 変換済みコンテンツの表示 |
| **画像表示**         | Supabase Storage から取得     |
| **カテゴリバッジ**   | カテゴリ別カラー適用          |
| **日付表示**         | 公開日・更新日                |
| **レスポンシブ**     | モバイル最適化                |

---

## 第 5 章　機能要件（Phase2）

### 5.1 　インタラクション強化

| 機能                         | 内容                                 | 技術                        |
| ---------------------------- | ------------------------------------ | --------------------------- |
| **スクロール進行バー**       | ページ上部に読了率を表示             | Framer Motion `useScroll`   |
| **目次固定表示**             | サイドバーに目次、現在位置ハイライト | IntersectionObserver        |
| **画像拡大機能**             | クリックで Lightbox 表示             | shadcn/ui Dialog            |
| **関連記事表示**             | 同カテゴリ記事をカード表示           | Supabase 関連クエリ         |
| **リアクションバー**         | 感情ボタン（💡🩷👍🔥）+ カウント      | Supabase Realtime           |
| **セクションアニメーション** | スクロールに応じてフェードイン       | Framer Motion `whileInView` |

---

## 第 6 章　技術要件

### 6.1 　技術スタック

| 分類               | 内容                                   |
| ------------------ | -------------------------------------- |
| **フレームワーク** | Next.js 15（App Router）               |
| **スタイリング**   | Tailwind CSS + Framer Motion           |
| **UI ライブラリ**  | shadcn/ui, Lucide Icons                |
| **データベース**   | Supabase（PostgreSQL）                 |
| **ストレージ**     | Supabase Storage（画像管理）           |
| **認証**           | Supabase Auth（管理者用、Phase2 以降） |
| **SEO**            | next-seo + 動的 OGP                    |
| **ホスティング**   | Vercel（ISR 構成）                     |
| **開発環境**       | VibeCoding + GitHub 連携               |

### 6.2 　 Supabase データベース設計

本ブログサイトは**80 記事以上の既存データ**を移行し運用するため、拡張性と保守性を重視した設計とする。

#### URL 設計方針

```
記事URL: https://www.sayo-kotoba.com/[prefecture]/[article-slug]/
例: https://www.sayo-kotoba.com/nagano/apple-harvest-iida-2024/

- 第1階層（都道府県）のみURLに含める
- 第2階層以降（市町村）はカテゴリとして管理
- SEO効果と実装のシンプルさを両立
```

---

#### テーブル: `posts`（記事）

| カラム          | 型        | 制約             | 説明                                        |
| --------------- | --------- | ---------------- | ------------------------------------------- |
| `id`            | UUID      | PRIMARY KEY      | 記事 ID                                     |
| `title`         | TEXT      | NOT NULL         | 記事タイトル                                |
| `slug`          | TEXT      | UNIQUE, NOT NULL | URL スラッグ（例: apple-harvest-iida-2024） |
| `content`       | TEXT      | NOT NULL         | 本文（HTML 形式）                           |
| `excerpt`       | TEXT      |                  | 抜粋文（150-200 文字推奨）                  |
| `thumbnail_url` | TEXT      |                  | サムネイル画像 URL（Supabase Storage）      |
| `view_count`    | INTEGER   | DEFAULT 0        | 閲覧数                                      |
| `published_at`  | TIMESTAMP |                  | 公開日時                                    |
| `updated_at`    | TIMESTAMP | DEFAULT NOW()    | 更新日時                                    |
| `is_published`  | BOOLEAN   | DEFAULT FALSE    | 公開状態（true=公開, false=下書き）         |
| `created_at`    | TIMESTAMP | DEFAULT NOW()    | 作成日時                                    |

```sql
-- postsテーブル作成SQL
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  thumbnail_url TEXT,
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX idx_posts_is_published ON posts(is_published);
CREATE INDEX idx_posts_view_count ON posts(view_count DESC);
```

---

#### テーブル: `categories`（地域階層カテゴリ）

階層的な地域分類を実現（都道府県 > 市町村 > 地区）

| カラム             | 型        | 制約                      | 説明                                         |
| ------------------ | --------- | ------------------------- | -------------------------------------------- |
| `id`               | UUID      | PRIMARY KEY               | カテゴリ ID                                  |
| `name`             | TEXT      | NOT NULL                  | 表示名（例: 長野県、飯田市、上郷）           |
| `slug`             | TEXT      | UNIQUE, NOT NULL          | URL 用スラッグ（例: nagano, iida, kamisato） |
| `parent_id`        | UUID      | REFERENCES categories(id) | 親カテゴリ ID（NULL は最上位）               |
| `order_num`        | INTEGER   | DEFAULT 0                 | 表示順序                                     |
| `description`      | TEXT      |                           | カテゴリ説明文                               |
| `image_url`        | TEXT      |                           | カテゴリイメージ画像 URL                     |
| `meta_title`       | TEXT      |                           | SEO 用タイトル                               |
| `meta_description` | TEXT      |                           | SEO 用説明文                                 |
| `is_active`        | BOOLEAN   | DEFAULT TRUE              | 有効/無効フラグ                              |
| `created_at`       | TIMESTAMP | DEFAULT NOW()             | 作成日時                                     |
| `updated_at`       | TIMESTAMP | DEFAULT NOW()             | 更新日時                                     |

```sql
-- categoriesテーブル作成SQL
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  order_num INTEGER DEFAULT 0,
  description TEXT,
  image_url TEXT,
  meta_title TEXT,
  meta_description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_order_num ON categories(order_num);
CREATE INDEX idx_categories_is_active ON categories(is_active);
```

**カテゴリ階層の例:**

```
長野県 (parent_id: NULL, slug: nagano)
  └─ 飯田市 (parent_id: 長野県ID, slug: iida)
      └─ 上郷 (parent_id: 飯田市ID, slug: kamisato)
  └─ 松本市 (parent_id: 長野県ID, slug: matsumoto)
```

---

#### テーブル: `post_categories`（記事とカテゴリの中間テーブル）

1 つの記事が複数のカテゴリに属することを可能にする

| カラム        | 型        | 制約                                        | 説明         |
| ------------- | --------- | ------------------------------------------- | ------------ |
| `post_id`     | UUID      | REFERENCES posts(id) ON DELETE CASCADE      | 記事 ID      |
| `category_id` | UUID      | REFERENCES categories(id) ON DELETE CASCADE | カテゴリ ID  |
| `created_at`  | TIMESTAMP | DEFAULT NOW()                               | 関連付け日時 |

```sql
-- post_categoriesテーブル作成SQL
CREATE TABLE post_categories (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (post_id, category_id)
);

-- インデックス作成
CREATE INDEX idx_post_categories_post_id ON post_categories(post_id);
CREATE INDEX idx_post_categories_category_id ON post_categories(category_id);
```

---

#### テーブル: `hashtags`（ハッシュタグ）

SNS 連携を想定した柔軟なタグ管理システム

| カラム       | 型        | 制約             | 説明                                      |
| ------------ | --------- | ---------------- | ----------------------------------------- |
| `id`         | UUID      | PRIMARY KEY      | ハッシュタグ ID                           |
| `name`       | TEXT      | UNIQUE, NOT NULL | ハッシュタグ名（#を除く、例: 飯田りんご） |
| `slug`       | TEXT      | UNIQUE, NOT NULL | URL 用スラッグ（例: iida-ringo）          |
| `count`      | INTEGER   | DEFAULT 0        | 使用回数（キャッシュ）                    |
| `created_at` | TIMESTAMP | DEFAULT NOW()    | 作成日時                                  |
| `updated_at` | TIMESTAMP | DEFAULT NOW()    | 更新日時                                  |

```sql
-- hashtagsテーブル作成SQL
CREATE TABLE hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_hashtags_name ON hashtags(name);
CREATE INDEX idx_hashtags_slug ON hashtags(slug);
CREATE INDEX idx_hashtags_count ON hashtags(count DESC);
```

**ハッシュタグの例:**

```
#飯田りんご (name: 飯田りんご, slug: iida-ringo)
#りんご狩り (name: りんご狩り, slug: ringo-gari)
#秋の信州 (name: 秋の信州, slug: aki-no-shinshu)
#古民家カフェ (name: 古民家カフェ, slug: kominka-cafe)
```

---

#### テーブル: `post_hashtags`（記事とハッシュタグの中間テーブル）

1 つの記事が複数のハッシュタグを持つことを可能にする

| カラム       | 型        | 制約                                      | 説明            |
| ------------ | --------- | ----------------------------------------- | --------------- |
| `post_id`    | UUID      | REFERENCES posts(id) ON DELETE CASCADE    | 記事 ID         |
| `hashtag_id` | UUID      | REFERENCES hashtags(id) ON DELETE CASCADE | ハッシュタグ ID |
| `created_at` | TIMESTAMP | DEFAULT NOW()                             | 関連付け日時    |

```sql
-- post_hashtagsテーブル作成SQL
CREATE TABLE post_hashtags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (post_id, hashtag_id)
);

-- インデックス作成
CREATE INDEX idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);
```

---

#### テーブル: `reactions`（Phase2: リアクション機能）

記事への感情表現（いいね等）を管理

| カラム          | 型        | 制約                                   | 説明                                        |
| --------------- | --------- | -------------------------------------- | ------------------------------------------- |
| `id`            | UUID      | PRIMARY KEY                            | リアクション ID                             |
| `post_id`       | UUID      | REFERENCES posts(id) ON DELETE CASCADE | 記事 ID                                     |
| `reaction_type` | TEXT      | NOT NULL                               | リアクション種類（light/heart/thumbs/fire） |
| `count`         | INTEGER   | DEFAULT 0                              | カウント数                                  |
| `created_at`    | TIMESTAMP | DEFAULT NOW()                          | 作成日時                                    |
| `updated_at`    | TIMESTAMP | DEFAULT NOW()                          | 更新日時                                    |

```sql
-- reactionsテーブル作成SQL（Phase2）
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('light', 'heart', 'thumbs', 'fire')),
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, reaction_type)
);

-- インデックス作成
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
CREATE INDEX idx_reactions_type ON reactions(reaction_type);
```

---

### 6.2.1 　データベース関係図

```
posts (記事)
  ├─ post_categories ─→ categories (地域階層カテゴリ)
  ├─ post_hashtags ─→ hashtags (ハッシュタグ)
  └─ reactions (リアクション) [Phase2]

categories (自己参照で階層構造)
  └─ parent_id ─→ categories.id
```

---

### 6.2.2 　 Row Level Security (RLS) 設定

公開記事のみ一般ユーザーに公開、管理者は全権限を持つ

```sql
-- postsテーブルのRLS有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 公開記事は誰でも閲覧可能
CREATE POLICY "公開記事は誰でも閲覧可能"
ON posts FOR SELECT
USING (is_published = true);

-- 認証済みユーザー（管理者）は全操作可能
CREATE POLICY "管理者は全記事を操作可能"
ON posts FOR ALL
USING (auth.role() = 'authenticated');

-- categoriesテーブルのRLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "カテゴリは誰でも閲覧可能"
ON categories FOR SELECT
USING (is_active = true);

CREATE POLICY "管理者はカテゴリを操作可能"
ON categories FOR ALL
USING (auth.role() = 'authenticated');

-- hashtagsテーブルのRLS
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ハッシュタグは誰でも閲覧可能"
ON hashtags FOR SELECT
USING (true);

CREATE POLICY "管理者はハッシュタグを操作可能"
ON hashtags FOR ALL
USING (auth.role() = 'authenticated');
```

---

### 6.2.3 　トリガー関数（自動更新）

#### ハッシュタグ使用回数の自動更新

```sql
-- ハッシュタグのcountを自動更新する関数
CREATE OR REPLACE FUNCTION update_hashtag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags
    SET count = count + 1, updated_at = NOW()
    WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hashtags
    SET count = count - 1, updated_at = NOW()
    WHERE id = OLD.hashtag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
CREATE TRIGGER trigger_update_hashtag_count
AFTER INSERT OR DELETE ON post_hashtags
FOR EACH ROW
EXECUTE FUNCTION update_hashtag_count();
```

#### 記事更新日時の自動更新

```sql
-- updated_atを自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- postsテーブルのトリガー
CREATE TRIGGER trigger_update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- categoriesテーブルのトリガー
CREATE TRIGGER trigger_update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### 6.3 　 API 設計

#### 記事関連 API

| エンドポイント           | メソッド | 説明                 | パラメータ                                        |
| ------------------------ | -------- | -------------------- | ------------------------------------------------- |
| `/api/posts`             | GET      | 記事一覧取得         | `?prefecture=nagano&limit=12&page=1`              |
| `/api/posts/[slug]`      | GET      | 個別記事取得         | slug（URL パラメータ）                            |
| `/api/posts/[slug]/view` | POST     | 閲覧数カウントアップ | -                                                 |
| `/api/posts/search`      | GET      | 記事検索             | `?q=keyword&prefecture=nagano&hashtag=りんご狩り` |

#### カテゴリ関連 API

| エンドポイント                 | メソッド | 説明               | パラメータ                        |
| ------------------------------ | -------- | ------------------ | --------------------------------- |
| `/api/categories`              | GET      | カテゴリ階層取得   | `?parent_id=null`（最上位のみ）   |
| `/api/categories/[slug]`       | GET      | カテゴリ詳細取得   | slug（URL パラメータ）            |
| `/api/categories/[slug]/posts` | GET      | カテゴリ別記事一覧 | `?include_children=true&limit=12` |

#### ハッシュタグ関連 API

| エンドポイント          | メソッド | 説明                   | パラメータ                           |
| ----------------------- | -------- | ---------------------- | ------------------------------------ |
| `/api/hashtags`         | GET      | ハッシュタグ一覧       | `?sort=popular&limit=20`             |
| `/api/hashtags/[slug]`  | GET      | ハッシュタグ別記事一覧 | slug（URL パラメータ）               |
| `/api/hashtags/suggest` | GET      | ハッシュタグ候補取得   | `?q=keyword`（オートコンプリート用） |

#### リアクション関連 API（Phase2）

| エンドポイント             | メソッド | 説明                   | パラメータ                   |
| -------------------------- | -------- | ---------------------- | ---------------------------- |
| `/api/reactions`           | POST     | リアクション追加       | `{ post_id, reaction_type }` |
| `/api/reactions/[post_id]` | GET      | 記事のリアクション取得 | post_id（URL パラメータ）    |

---

### 6.3.1 　 API レスポンス例

#### 記事一覧取得: `GET /api/posts?prefecture=nagano`

```json
{
  "posts": [
    {
      "id": "uuid",
      "title": "秋の飯田市で極上りんご狩り体験",
      "slug": "apple-harvest-iida-2024",
      "excerpt": "長野県飯田市のりんご農園で...",
      "thumbnail_url": "https://...",
      "view_count": 1234,
      "published_at": "2024-10-15T10:00:00Z",
      "categories": [
        {
          "id": "uuid",
          "name": "長野県",
          "slug": "nagano"
        },
        {
          "id": "uuid",
          "name": "飯田市",
          "slug": "iida",
          "parent": {
            "name": "長野県",
            "slug": "nagano"
          }
        }
      ],
      "hashtags": [
        { "name": "飯田りんご", "slug": "iida-ringo" },
        { "name": "りんご狩り", "slug": "ringo-gari" },
        { "name": "秋の信州", "slug": "aki-no-shinshu" }
      ]
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 12,
  "hasMore": true
}
```

#### 個別記事取得: `GET /api/posts/apple-harvest-iida-2024`

```json
{
  "post": {
    "id": "uuid",
    "title": "秋の飯田市で極上りんご狩り体験",
    "slug": "apple-harvest-iida-2024",
    "content": "<p>長野県飯田市のりんご農園で...</p>",
    "excerpt": "長野県飯田市のりんご農園で...",
    "thumbnail_url": "https://...",
    "view_count": 1234,
    "published_at": "2024-10-15T10:00:00Z",
    "updated_at": "2024-10-20T15:30:00Z",
    "categories": [
      {
        "id": "uuid",
        "name": "長野県",
        "slug": "nagano",
        "parent_id": null
      },
      {
        "id": "uuid",
        "name": "飯田市",
        "slug": "iida",
        "parent_id": "long-prefecture-uuid"
      },
      {
        "id": "uuid",
        "name": "上郷",
        "slug": "kamisato",
        "parent_id": "iida-uuid"
      }
    ],
    "hashtags": [
      { "name": "飯田りんご", "slug": "iida-ringo", "count": 15 },
      { "name": "りんご狩り", "slug": "ringo-gari", "count": 28 },
      { "name": "秋の信州", "slug": "aki-no-shinshu", "count": 42 }
    ],
    "related_posts": [
      {
        "id": "uuid",
        "title": "飯田のりんご農家を訪ねて",
        "slug": "iida-apple-farmer",
        "thumbnail_url": "https://..."
      }
    ]
  }
}
```

#### カテゴリ階層取得: `GET /api/categories`

```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "長野県",
      "slug": "nagano",
      "parent_id": null,
      "post_count": 45,
      "children": [
        {
          "id": "uuid",
          "name": "飯田市",
          "slug": "iida",
          "parent_id": "nagano-uuid",
          "post_count": 15,
          "children": [
            {
              "id": "uuid",
              "name": "上郷",
              "slug": "kamisato",
              "parent_id": "iida-uuid",
              "post_count": 8
            }
          ]
        },
        {
          "id": "uuid",
          "name": "松本市",
          "slug": "matsumoto",
          "parent_id": "nagano-uuid",
          "post_count": 12
        }
      ]
    }
  ]
}
```

#### 人気ハッシュタグ取得: `GET /api/hashtags?sort=popular&limit=10`

```json
{
  "hashtags": [
    { "name": "飯田りんご", "slug": "iida-ringo", "count": 15 },
    { "name": "信州そば", "slug": "shinshu-soba", "count": 12 },
    { "name": "古民家カフェ", "slug": "kominka-cafe", "count": 10 },
    { "name": "温泉旅行", "slug": "onsen-ryoko", "count": 9 }
  ]
}
```

---

## 第 7 章　モーション仕様

### 7.1 　 Phase1（基本モーション）

| 対象               | モーション                  | 設定                     |
| ------------------ | --------------------------- | ------------------------ |
| **カードホバー**   | `scale: 1.02, y: -2px`      | `duration: 0.2s`         |
| **カード初期表示** | `opacity: 0 → 1, y: 20 → 0` | `staggerChildren: 0.05s` |
| **フィルター切替** | `layout animation`          | Framer Motion `layoutId` |

### 7.2 　 Phase2（インタラクション強化）

| 対象                       | モーション                   | 設定                       |
| -------------------------- | ---------------------------- | -------------------------- |
| **セクションフェードイン** | `whileInView`                | `viewport: { once: true }` |
| **スクロール進行バー**     | `scaleX: 0 → 1`              | `useScroll` hook           |
| **関連記事スライドイン**   | `x: 100 → 0, opacity: 0 → 1` | `delay: 0.2s`              |

---

## 第 8 章　非機能要件

| 項目                 | 内容                                       |
| -------------------- | ------------------------------------------ |
| **パフォーマンス**   | 初期読み込み 2.5s 以内、Lighthouse 90 以上 |
| **レスポンシブ**     | 375px〜1920px 対応                         |
| **アクセシビリティ** | alt 属性・見出し階層・キーボード操作対応   |
| **SEO 最適化**       | 構造化データ・meta タグ自動生成            |
| **拡張性**           | 記事追加・カテゴリ追加が容易               |

---

## 第 9 章　データマイグレーション計画

### 9.1 　既存データ概要

- **記事数**: 80 記事以上
- **形式**: Excel バックアップ
- **画像**: 別途バックアップ済み
- **移行元**: https://www.sayo-kotoba.com/

### 9.2 　マイグレーション手順

#### Step 1: カテゴリ階層の構築

```sql
-- 1. 最上位カテゴリ（都道府県）を作成
INSERT INTO categories (name, slug, parent_id, order_num, is_active)
VALUES
  ('長野県', 'nagano', NULL, 1, true),
  ('東京都', 'tokyo', NULL, 2, true);

-- 2. 第2階層（市町村）を作成
INSERT INTO categories (name, slug, parent_id, order_num, is_active)
VALUES
  ('飯田市', 'iida', (SELECT id FROM categories WHERE slug = 'nagano'), 1, true),
  ('松本市', 'matsumoto', (SELECT id FROM categories WHERE slug = 'nagano'), 2, true);

-- 3. 第3階層（地区）を作成
INSERT INTO categories (name, slug, parent_id, order_num, is_active)
VALUES
  ('上郷', 'kamisato', (SELECT id FROM categories WHERE slug = 'iida'), 1, true);
```

#### Step 2: ハッシュタグマスターの作成

```sql
-- よく使うハッシュタグを事前登録
INSERT INTO hashtags (name, slug, count)
VALUES
  ('飯田りんご', 'iida-ringo', 0),
  ('信州そば', 'shinshu-soba', 0),
  ('古民家カフェ', 'kominka-cafe', 0),
  ('温泉旅行', 'onsen-ryoko', 0),
  ('秋の信州', 'aki-no-shinshu', 0),
  ('りんご狩り', 'ringo-gari', 0);
```

#### Step 3: 画像の Supabase Storage へのアップロード

**ディレクトリ構造:**

```
/thumbnails/
  ├─ 2024/
  │   ├─ 10/
  │   │   ├─ apple-harvest-iida-2024.jpg
  │   │   └─ matsumoto-onsen-2024.jpg
  │   └─ 11/
  └─ 2023/
```

**アップロードスクリプト例:**

```typescript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function uploadImages() {
  const imageDir = './backup/images';
  const files = fs.readdirSync(imageDir);

  for (const file of files) {
    const filePath = path.join(imageDir, file);
    const fileBuffer = fs.readFileSync(filePath);

    const { data, error } = await supabase.storage
      .from('thumbnails')
      .upload(`2024/10/${file}`, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error(`Failed to upload ${file}:`, error);
    } else {
      console.log(`Uploaded: ${file}`);
    }
  }
}

uploadImages();
```

#### Step 4: Excel データの整形とインポート

**Excel データ構造例:**

```
| タイトル | スラッグ | 本文 | 抜粋 | カテゴリ1 | カテゴリ2 | カテゴリ3 | ハッシュタグ | 画像名 | 公開日 |
|---------|---------|------|------|----------|----------|----------|------------|--------|--------|
| 秋の飯田市で極上りんご狩り体験 | apple-harvest-iida-2024 | ... | ... | 長野県 | 飯田市 | 上郷 | 飯田りんご,りんご狩り,秋の信州 | apple-harvest.jpg | 2024-10-15 |
```

**CSV 変換 → Supabase インポートスクリプト:**

```typescript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import Papa from 'papaparse';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function importPosts() {
  // 1. CSVファイル読み込み
  const csvFile = fs.readFileSync('./backup/posts.csv', 'utf8');
  const { data: posts } = Papa.parse(csvFile, { header: true });

  for (const row of posts) {
    // 2. 記事をインサート
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        title: row['タイトル'],
        slug: row['スラッグ'],
        content: row['本文'],
        excerpt: row['抜粋'],
        thumbnail_url: `https://[project-id].supabase.co/storage/v1/object/public/thumbnails/2024/10/${row['画像名']}`,
        published_at: row['公開日'],
        is_published: true,
        view_count: 0,
      })
      .select()
      .single();

    if (postError) {
      console.error(`Failed to insert post: ${row['タイトル']}`, postError);
      continue;
    }

    // 3. カテゴリとの関連付け
    const categoryNames = [
      row['カテゴリ1'],
      row['カテゴリ2'],
      row['カテゴリ3'],
    ].filter(Boolean);

    for (const categoryName of categoryNames) {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (category) {
        await supabase.from('post_categories').insert({
          post_id: post.id,
          category_id: category.id,
        });
      }
    }

    // 4. ハッシュタグとの関連付け
    const hashtags = row['ハッシュタグ'].split(',').map((tag) => tag.trim());

    for (const hashtagName of hashtags) {
      // ハッシュタグが存在しない場合は作成
      const { data: hashtag } = await supabase
        .from('hashtags')
        .upsert(
          {
            name: hashtagName,
            slug: hashtagName.toLowerCase().replace(/\s+/g, '-'),
          },
          {
            onConflict: 'name',
          }
        )
        .select()
        .single();

      if (hashtag) {
        await supabase.from('post_hashtags').insert({
          post_id: post.id,
          hashtag_id: hashtag.id,
        });
      }
    }

    console.log(`✓ Imported: ${row['タイトル']}`);
  }

  console.log('Migration completed!');
}

importPosts();
```

#### Step 5: データ検証

```sql
-- 記事数の確認
SELECT COUNT(*) FROM posts WHERE is_published = true;

-- カテゴリ階層の確認
SELECT
  c1.name AS level1,
  c2.name AS level2,
  c3.name AS level3,
  COUNT(p.id) AS post_count
FROM categories c1
LEFT JOIN categories c2 ON c2.parent_id = c1.id
LEFT JOIN categories c3 ON c3.parent_id = c2.id
LEFT JOIN post_categories pc ON pc.category_id IN (c1.id, c2.id, c3.id)
LEFT JOIN posts p ON p.id = pc.post_id
WHERE c1.parent_id IS NULL
GROUP BY c1.name, c2.name, c3.name
ORDER BY c1.order_num, c2.order_num, c3.order_num;

-- ハッシュタグ使用状況の確認
SELECT
  h.name,
  h.count,
  COUNT(ph.post_id) AS actual_count
FROM hashtags h
LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id
GROUP BY h.id, h.name, h.count
ORDER BY h.count DESC;

-- 孤立データのチェック（関連付けされていない記事）
SELECT p.id, p.title
FROM posts p
LEFT JOIN post_categories pc ON pc.post_id = p.id
WHERE pc.post_id IS NULL;
```

### 9.3 　 Phase1 開発時のテストデータ

開発時は以下のダミーデータで構築：

**カテゴリ:**

```
長野県
  ├─ 飯田市
  │   └─ 上郷
  └─ 松本市
```

**記事: 5-10 件**

- 各カテゴリに 1-2 記事
- ダミー画像: Unsplash API 等を使用
- ハッシュタグ: 各記事に 3-5 個

**ダミーデータ生成スクリプト:**

```typescript
const dummyPosts = [
  {
    title: '秋の飯田市で極上りんご狩り体験',
    slug: 'apple-harvest-iida-2024',
    categories: ['長野県', '飯田市', '上郷'],
    hashtags: ['飯田りんご', 'りんご狩り', '秋の信州'],
  },
  // ... 他のダミーデータ
];
```

### 9.4 　リスク管理

| リスク         | 対策                                    |
| -------------- | --------------------------------------- |
| データ欠損     | バックアップからの復元手順を事前準備    |
| 画像リンク切れ | 移行前に画像の存在確認スクリプト実行    |
| カテゴリ不整合 | カテゴリマッピング表を事前作成          |
| スラッグ重複   | UNIQUE 制約により自動検出、手動修正     |
| 移行時間       | バッチ処理（10 記事ずつ）で段階的に実行 |

### 9.5 　移行スケジュール（案）

| ステップ         | 所要時間      | 担当            |
| ---------------- | ------------- | --------------- |
| カテゴリ構築     | 1 時間        | 開発者          |
| 画像アップロード | 2-3 時間      | 開発者          |
| Excel データ整形 | 2-3 時間      | 紗代氏 + 開発者 |
| データインポート | 3-4 時間      | 開発者          |
| データ検証       | 1-2 時間      | 開発者 + 紗代氏 |
| **合計**         | **9-13 時間** |                 |

### 9.6 　移行後の確認項目

- [ ] 全 80 記事が正常にインポートされている
- [ ] 画像がすべて正しく表示される
- [ ] カテゴリ階層が正しく構築されている
- [ ] ハッシュタグのカウントが正確
- [ ] パンくずリストが正しく表示される
- [ ] URL が `/nagano/[slug]/` 形式で動作する
- [ ] フィルター・検索機能が動作する
- [ ] SEO メタタグが正しく生成される

---

## 第 10 章　開発環境セットアップ

### 10.1 　必要な準備

- [ ] GitHub リポジトリ作成
- [ ] Vercel アカウント準備
- [ ] Supabase プロジェクト作成
- [ ] 環境変数設定（`.env.local`）

### 10.2 　環境変数

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site Config
NEXT_PUBLIC_SITE_URL=https://sayos-journal.vercel.app
```

---

## 第 11 章　納品物

### Phase1

- Next.js プロジェクト（App Router 構成）
- Tailwind 設定・グローバルスタイル
- 基本コンポーネント群
- Supabase スキーマ定義（SQL）
- README.md（環境構築手順）

### Phase2

- インタラクション機能追加コンポーネント
- アニメーション設定ファイル
- 更新版 README.md

---

## 第 12 章　開発スケジュール（案）

| Week       | Phase  | タスク                                               |
| ---------- | ------ | ---------------------------------------------------- |
| **Week 1** | Phase1 | プロジェクト初期化、Supabase 設定、基本レイアウト    |
| **Week 2** | Phase1 | トップページ実装、フィルター機能、記事ページ基本表示 |
| **Week 3** | Phase1 | レスポンシブ調整、テスト、Phase1 完了                |
| **Week 4** | Phase2 | スクロール進行、目次固定、画像拡大                   |
| **Week 5** | Phase2 | 関連記事、リアクション機能、最終調整                 |

---

## ✅ 最終要約

本サイトは**「柔らかい語り口 × シンプルなモーション」**を核とし、Supabase による堅牢なデータ管理と、Next.js + Tailwind + Framer Motion による洗練された UI を実現する。

**Phase1 でコア機能を確実に実装**し、**Phase2 でインタラクションを強化**する 2 段階構成により、段階的な品質向上を図る。

VibeCoding での開発を前提に、コンポーネント駆動開発を徹底し、保守性と拡張性を担保する。

---

**作成日**: 2025 年 10 月 24 日  
**バージョン**: v1.0  
**作成者**: Claude (Anthropic)
