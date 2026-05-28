# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.
Detailed rules are split into `.claude/rules/` for context-efficient loading.

## Project Overview

**Sayo's Journal** - A narrative blog site combining "words × photos × experiences" for writer/interviewer Sayo Motooka. Built with Next.js 15 + Supabase + Tailwind CSS.

## Development Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm start           # Start production server
npm run lint        # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 3.4.17
- **Database**: Supabase (PostgreSQL + pgvector)
- **Storage**: Supabase Storage (for images: `thumbnails` / `ig-posts` / `inquiry-images`)
- **AI**: Google Gemini (gemini-3-flash-preview + gemini-embedding-2-preview)
- **Language**: TypeScript 5
- **React**: 19.1.0

## Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout (fonts + global metadata)
│   ├── (chat)/              # AI Chat page (ChatHeader, no Footer) — 開発中
│   ├── (public)/            # Public pages (Header + Footer)
│   │   ├── page.tsx         # Home (Hero + Pick Up 6 posts)
│   │   ├── blog/page.tsx    # Blog listing ("もっと見る" button)
│   │   ├── [category]/      # Category listing
│   │   ├── [category]/[slug]/ # Article detail
│   │   ├── privacy/         # Privacy Policy
│   │   └── search/          # Search page
│   ├── (admin)/admin/       # Admin panel (CMS + AI + Instagram)
│   ├── (auth)/admin/login/  # Login
│   └── api/                 # API routes
├── components/
│   ├── ui/                  # Base UI components
│   ├── ai/                  # AI Chat components
│   └── admin/               # Admin components (Tiptap editor)
└── lib/                     # Utilities, types, Supabase clients
```

## URL Structure

```
/                              → Home (Hero + Pick Up posts)
/blog                          → Blog listing ("もっと見る" button)
/blog?category=gourmet         → Category filter
/blog?hashtags=tag1,tag2       → Hashtag filter
/blog?sort=popular             → Sort by view count
/gourmet/                      → Category listing page
/gourmet/[slug]/               → Article detail
/search?q=keyword              → Search results
/chat                          → AI Chat (admin: full chat, user: teaser)
/privacy                       → Privacy Policy
/about                         → About (FUNE profile + 3つの記事のかたち + 情報窓口 CTA)
/request/mini                  → ミニ記事の情報提供フォーム (BotID + Zod + Gmail SMTP 通知)
/request/mini/thanks           → ミニ記事 送信完了画面 (noindex)
/request/long                  → 取材依頼フォーム (種別ごと条件出し分け + BotID + Gmail SMTP 通知)
/request/long/thanks           → ロング記事 送信完了画面 (noindex)
/admin/                        → Admin dashboard
/admin/ai/knowledge            → AI Knowledge management
/admin/ai/tags                 → AI Prompt Tags management
/admin/ai/analytics            → AI Analytics dashboard
/admin/inquiries               → 依頼管理 (ミニ/ロングのタブ切替 + 件数バッジ + 詳細/ステータス操作/削除)
/admin/inquiries/[id]/generate → ミニ記事の AI 記事化 (本文貼付 + 追加画像 → 下書き生成)
/admin/instagram/posts         → IG 下書き管理 (セクション選択式生成 + 編集)
/admin/posts                   → 記事一覧 (出自タブ: 自由記事 / ミニ記事 / ロング記事)
/admin/posts/[id]              → 記事編集 (タイトル + 本文 + イベント情報 + 公開設定)
/admin/posts/[id]/preview      → 下書きプレビュー (chromeless layout, is_published 関係なく表示)
```

**Categories** (flat): gourmet, event, spot, culture, news

## Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=https://www.sayo-kotoba.com
ADMIN_PASSWORD=your-secure-admin-password
NEXT_PUBLIC_GA_MEASUREMENT_ID=  # GA4 (optional, set when available)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3-flash-preview        # default: gemini-3-flash-preview
EMBEDDING_MODEL=gemini-embedding-2-preview # default: gemini-embedding-2-preview
# 情報窓口フォーム メール通知 (Gmail SMTP / Nodemailer)
GMAIL_SMTP_USER=your-gmail-address@gmail.com         # 送信元 Gmail
GMAIL_SMTP_APP_PASSWORD=your-gmail-app-password       # Google アプリパスワード (2段階認証必須)
INQUIRY_NOTIFY_TO=notify-destination@gmail.com        # 通知先 (紗代さんのメール)
```

## Conventions

- Use `@/` path alias for all imports
- Use `PostWithRelations` type (not `Post`) for components needing nested data
- Feature tickets live in `docs/*.md` with numeric prefix (e.g. `29_xxx.md`)

### Todo format in ticket files

Each ticket file (`docs/NN_*.md`) manages its own Todo list under 「完了条件」.
- Unfinished: `- [ ]`
- **Completed: `- [×]`** (full-width ×, NOT `- [x]` or `- [✓]`)
- When a task is finished, immediately update `- [ ]` → `- [×]` in the corresponding ticket
- Do not delete completed items — keep the full history visible

## MCP Setup

Supabase Project: `sayo-blog` (ID: `nkvohswifpmarobyrnbe`, Region: ap-northeast-1)

## Rules Directory

Context-specific rules are loaded based on file paths being worked on:

| File | Loaded when working on | Content |
|------|----------------------|---------|
| `.claude/rules/nextjs-patterns.md` | `src/app/**`, `src/components/**` | Next.js 15 best practices |
| `.claude/rules/frontend.md` | `src/components/**`, `src/app/(public)/**` | Design system, known issues |
| `.claude/rules/admin.md` | `src/app/(admin)/**`, `src/components/admin/**` | Admin panel, Tiptap, Dialog pattern |
| `.claude/rules/database.md` | `src/lib/supabase*`, `src/app/api/**`, `supabase/**` | DB schema, Supabase patterns |
| `.claude/rules/instagram.md` | `src/lib/ig-*`, `src/lib/post-sections*`, `src/app/**/instagram/**` | Blog 執筆ルール, キャプション設計, サニタイザ |
| `.claude/rules/implementation-status.md` | Always | Completed tickets, file map |

## Blog Authoring Rule for Instagram Integration

**IG 投稿する記事は必ず「h2 見出し → 画像 → 文章」のセクション構造で書く。**
1 セクション = 1 IG 投稿にマッピングされる。詳細は `.claude/rules/instagram.md` 参照。

---

**Created**: 2025-11-13
**Updated**: 2026-05-28 (Ticket 42: ロング記事フロー = 公開フォーム /request/long + 案件管理 CRM (ステータス7段階/取材日/金額/紐付け) + ArticleTypeBadge 公開記事に表示 + 新規記事作成時の依頼紐付け + 自動公開連動)
**Project Status**: Phase 1 + Phase 2 complete / Phase 3 (29-32, 37 done; 34-36 廃止; 33 保留; 38-39 pending) / Phase 4 情報窓口フォーム complete (40-42 done) / AI Chat paused
