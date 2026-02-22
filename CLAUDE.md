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
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (for images)
- **Language**: TypeScript 5
- **React**: 19.1.0

## Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout (fonts + global metadata)
│   ├── (public)/            # Public pages (Header + Footer)
│   │   ├── page.tsx         # Home page (infinite scroll)
│   │   ├── [category]/[slug]/ # Article detail
│   │   └── search/          # Search page
│   ├── (admin)/admin/       # Admin panel (CMS)
│   ├── (auth)/admin/login/  # Login
│   └── api/                 # API routes
├── components/
│   ├── ui/                  # Base UI components
│   └── admin/               # Admin components (Tiptap editor)
└── lib/                     # Utilities, types, Supabase clients
```

## URL Structure

```
/                              → Home (all articles, infinite scroll)
/gourmet/[slug]/               → Article detail
/?category=gourmet             → Category filter
/?hashtags=tag1,tag2           → Hashtag filter
/?sort=popular                 → Sort by view count
/search?q=keyword              → Search results
/admin/                        → Admin dashboard
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
**Updated**: 2026-02-22 (Ticket 15: Interactive Enhancements)
**Project Status**: Phase 1 completed + Admin Panel + SEO + Interactive Enhancements
