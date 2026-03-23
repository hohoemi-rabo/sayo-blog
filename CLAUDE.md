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
- **Storage**: Supabase Storage (for images)
- **AI**: Google Gemini (gemini-3-flash-preview + gemini-embedding-001)
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
│   ├── (admin)/admin/       # Admin panel (CMS + AI management)
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
/about                         → About (TBD)
/admin/                        → Admin dashboard
/admin/ai/knowledge            → AI Knowledge management
/admin/ai/tags                 → AI Prompt Tags management
/admin/ai/analytics            → AI Analytics dashboard
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
EMBEDDING_MODEL=gemini-embedding-001       # default: gemini-embedding-001
```

## Conventions

- Use `@/` path alias for all imports
- Use `PostWithRelations` type (not `Post`) for components needing nested data
- Todo format: `- [×]` for completed (not `- [x]` or `- [✓]`)
- Feature tickets in `docs/*.md`

## MCP Setup

Supabase Project: `sayo-blog` (ID: `nkvohswifpmarobyrnbe`, Region: ap-northeast-1)

## Rules Directory

Context-specific rules are loaded based on file paths being worked on:

| File | Loaded when working on | Content |
|------|----------------------|---------|
| `.claude/rules/nextjs-patterns.md` | `src/app/**`, `src/components/**` | Next.js 15 best practices |
| `.claude/rules/frontend.md` | `src/components/**`, `src/app/(public)/**` | Design system, known issues |
| `.claude/rules/admin.md` | `src/app/(admin)/**`, `src/components/admin/**` | Admin panel, Tiptap issues |
| `.claude/rules/database.md` | `src/lib/supabase*`, `src/app/api/**`, `supabase/**` | DB schema, Supabase patterns |
| `.claude/rules/implementation-status.md` | Always | Completed tickets, file map |

---

**Created**: 2025-11-13
**Updated**: 2026-03-22 (Blog home, category pages, featured posts)
**Project Status**: Phase 1 + Phase 2 completed, Blog home redesigned, AI Chat paused
