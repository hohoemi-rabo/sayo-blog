---
paths:
  - "src/app/(admin)/**"
  - "src/components/admin/**"
  - "src/app/(auth)/**"
  - "src/lib/supabase-browser.ts"
---

# Admin Panel Rules

## Architecture

- Admin routes: `/admin/*` (protected by middleware)
- Auth: `/admin/login/` with cookie-based session
- Layout: Sidebar + Header
- Supabase client: `supabase-browser.ts` (browser-side singleton)

## Key Components

- `Sidebar.tsx` - Navigation sidebar (Main nav + AI Management section)
- `Header.tsx` - Header with logout button
- `ImageUploader.tsx` - Supabase Storage image upload
- `MediaPickerDialog.tsx` - Media library picker with React Portal
- `editor/RichTextEditor.tsx` - Tiptap rich text editor (dynamic import, SSR-safe)

## AI Management Pages

- `/admin/ai/knowledge` — ナレッジデータ管理 (CRUD + Gemini 一括生成)
- `/admin/ai/tags` — プロンプトタグ管理 (CRUD + AI 一括生成)
- `/admin/ai/analytics` — 利用統計ダッシュボード (統計カード, 日別グラフ, TOP10, 制限管理)

### AI Admin Pattern
- Server Actions (`actions.ts`) for data fetching / mutations
- `_components/` directory for page-specific components
- `createAdminClient()` for DB access
- Cookie-based auth check (`admin_auth`) for API routes

## Known Issues

### Tiptap Editor in React 18 StrictMode
**Issue**: Duplicate extension warning
**Solution**: Module-level singleton cache for extensions:
```typescript
const extensionsCache = new Map<string, Extension[]>()
function getExtensions(placeholder: string) {
  if (!extensionsCache.has(placeholder)) {
    extensionsCache.set(placeholder, createBaseExtensions(placeholder))
  }
  return extensionsCache.get(placeholder)!
}
```

### Tiptap BubbleMenu Z-Index
**Issue**: BubbleMenu behind sidebar, cut off at edges
**Solution**: Custom bubble menu using React Portal + Floating UI:
- Portal renders to `document.body` (escapes stacking context)
- `z-index: 9999` above sidebar (z-40)
- Floating UI `shift` + `flip` for viewport awareness

### Dialog Infinite Loop (React Portal Pattern)
**Issue**: MediaPickerDialog rapidly opens/closes in loop
**Solution**: Use `useRef` to prevent duplicate fetches:
```typescript
const hasFetched = useRef(false)
// Reset ref when dialog closes
useEffect(() => { if (!open) hasFetched.current = false }, [open])
```

### Media Usage Check & Safe Image Deletion
- **Post edit page (ImageUploader)**: Only clears URL, does NOT delete from Storage
- **Media management page**: Checks usage before deletion
  - `checkMediaUsage()` checks both `thumbnail_url` AND `content` (記事本文内の画像)
  - Returns `MediaUsageResult` with `details[]` containing per-post usage types
  - Dialog shows each affected post with usage type labels: (サムネイル) / (記事本文)
  - Single delete: shows up to 5 affected posts with usage details
  - Bulk delete: merges usage across all selected files, shows combined details

### Custom Checkbox
Wrap in `<label>` element to make visual checkbox clickable:
```typescript
<label htmlFor={id} className="cursor-pointer">
  <input id={id} type="checkbox" className="sr-only" />
  <div className="checkbox-visual">...</div>
</label>
```
