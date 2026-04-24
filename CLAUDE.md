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
- **Storage**: Supabase Storage (for images: `thumbnails` / `ig-posts` / `ig-imported`)
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
/about                         → About (FUNE profile + specialties + contact CTA)
/admin/                        → Admin dashboard
/admin/ai/knowledge            → AI Knowledge management
/admin/ai/tags                 → AI Prompt Tags management
/admin/ai/analytics            → AI Analytics dashboard
/admin/instagram/posts         → IG 下書き管理 (セクション選択式生成 + 編集)
/admin/instagram/sources       → IG 取得先アカウント管理 (Ticket 34 で実装予定)
/admin/instagram/imports       → IG 取得投稿管理 (Ticket 36 で実装予定)
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
**Updated**: 2026-04-24 (Phase 3A: Ticket 32 完了、公開時自動生成 + 記事編集画面の IG セクション)
**Project Status**: Phase 1 + Phase 2 complete / Phase 3 in progress (29-32 done, 33-39 pending) / AI Chat paused
