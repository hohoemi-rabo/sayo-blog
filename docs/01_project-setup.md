# 01: Project Setup & Environment Configuration

## Overview

Initial project setup including Next.js configuration, Supabase integration, environment variables, and development tooling.

## Related Files

- `package.json` - Dependencies
- `.env.local` - Environment variables
- `.env.example` - Environment template
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind configuration
- `.mcp.json` - Supabase MCP configuration
- `.gitignore` - Git ignore rules

## Technical Details

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://nkvohswifpmarobyrnbe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=https://www.sayo-kotoba.com
```

### Required Dependencies

```json
{
  "dependencies": {
    "next": "15.5.6",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "@supabase/supabase-js": "latest",
    "framer-motion": "latest"
  },
  "devDependencies": {
    "typescript": "^5",
    "tailwindcss": "3.4.17",
    "@types/node": "^20",
    "@types/react": "^19",
    "eslint": "^9",
    "eslint-config-next": "15.5.6"
  }
}
```

### Next.js Configuration

Enable image optimization for Supabase Storage:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};
```

## Todo

- [ ] Install dependencies (`npm install`)
- [ ] Create `.env.local` from Supabase project settings
- [ ] Create `.env.example` template
- [ ] Configure Next.js for Supabase images
- [ ] Set up MCP configuration (`.mcp.json`)
- [ ] Verify MCP connection with `claude mcp list`
- [ ] Test development server (`npm run dev`)
- [ ] Configure ESLint rules
- [ ] Set up Git hooks (optional: Husky)
- [ ] Create initial project structure:
  - [ ] `src/lib/supabase.ts` - Supabase client
  - [ ] `src/lib/types.ts` - TypeScript types
  - [ ] `src/components/` - Component directory
  - [ ] `src/app/api/` - API routes

## References

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Tailwind CSS Configuration](https://tailwindcss.com/docs/configuration)
- CLAUDE.md - Development guide
- REQUIREMENTS.md - Complete specifications

## Notes

- Use `@/` path alias for imports (configured in tsconfig.json)
- Supabase project: `sayo-blog` (ID: `nkvohswifpmarobyrnbe`)
- Region: `ap-northeast-1` (Tokyo)
