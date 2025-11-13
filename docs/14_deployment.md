# 14: Deployment Configuration

## Overview

Configure deployment to Vercel with ISR, environment variables, custom domain, and performance optimization. Set up CI/CD pipeline for automated deployments.

## Related Files

- `vercel.json` - Vercel configuration
- `.env.production` - Production environment variables
- `.github/workflows/deploy.yml` - CI/CD deployment workflow
- `next.config.js` - Next.js production configuration

## Technical Details

### Deployment Platform

- **Platform**: Vercel
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Node Version**: 18.x or 20.x
- **Deployment Type**: Production + Preview branches

### ISR Configuration

- **Revalidation**: 3600 seconds (1 hour) for article pages
- **On-Demand Revalidation**: Available for content updates
- **Static Generation**: Pre-render top 30 most popular articles

### Environment Setup

- Production environment variables in Vercel dashboard
- Separate Supabase project for production (recommended)
- Custom domain configuration

## Todo

### Vercel Project Setup

- [ ] Create Vercel account (if not exists)
- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Link project: `vercel link`
- [ ] Configure project settings in Vercel dashboard
- [ ] Set Node.js version: 20.x
- [ ] Enable automatic deployments from GitHub
- [ ] Configure build settings

### Environment Variables

- [ ] Add production environment variables in Vercel dashboard:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] Verify all environment variables are set
- [ ] Test environment variables in preview deployment
- [ ] Document required environment variables in README

### Production Configuration

- [ ] Create `vercel.json` configuration
- [ ] Configure ISR settings
- [ ] Set up custom headers (security, caching)
- [ ] Configure redirects (if needed)
- [ ] Set up rewrites (if needed)
- [ ] Configure edge functions (if needed)

### Next.js Configuration

- [ ] Update `next.config.js` for production
- [ ] Enable image optimization
- [ ] Configure allowed image domains (Supabase Storage)
- [ ] Enable compression
- [ ] Configure security headers
- [ ] Set up Content Security Policy (optional)
- [ ] Configure caching headers

### Custom Domain Setup

- [ ] Purchase/configure domain: www.sayo-kotoba.com
- [ ] Add domain in Vercel dashboard
- [ ] Configure DNS records:
  - [ ] A record pointing to Vercel IP
  - [ ] CNAME record for www subdomain
- [ ] Enable SSL certificate (automatic via Vercel)
- [ ] Test domain accessibility
- [ ] Set up redirect from non-www to www (or vice versa)

### CI/CD Pipeline

- [ ] Create `.github/workflows/deploy.yml`
- [ ] Configure automatic deployments:
  - [ ] Production: on push to `main` branch
  - [ ] Preview: on pull requests
- [ ] Add deployment status checks
- [ ] Configure deployment notifications (optional)
- [ ] Set up deployment rollback procedure

### Performance Optimization

- [ ] Enable Vercel Analytics
- [ ] Configure Edge Caching
- [ ] Enable Image Optimization
- [ ] Set up Compression (Brotli/Gzip)
- [ ] Configure Cache-Control headers
- [ ] Enable HTTP/2 and HTTP/3
- [ ] Test performance with Lighthouse
- [ ] Optimize bundle size

### Security Configuration

- [ ] Set security headers:
  - [ ] X-Frame-Options
  - [ ] X-Content-Type-Options
  - [ ] Referrer-Policy
  - [ ] Permissions-Policy
  - [ ] Strict-Transport-Security (HSTS)
- [ ] Configure CORS (if needed)
- [ ] Enable rate limiting (if needed)
- [ ] Set up DDoS protection (Vercel default)
- [ ] Configure Content Security Policy

### Monitoring & Analytics

- [ ] Set up Vercel Analytics
- [ ] Configure Google Analytics 4 (optional)
- [ ] Set up error tracking (Sentry, optional)
- [ ] Configure performance monitoring
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation

### Deployment Checklist

- [ ] Run production build locally: `npm run build`
- [ ] Test production build: `npm run start`
- [ ] Verify environment variables
- [ ] Check for console errors
- [ ] Test all critical pages
- [ ] Verify image loading
- [ ] Test ISR revalidation
- [ ] Check SEO metadata
- [ ] Verify sitemap.xml accessibility
- [ ] Test robots.txt
- [ ] Run Lighthouse audit (score > 90)
- [ ] Test on multiple devices/browsers

### Post-Deployment

- [ ] Verify production site is accessible
- [ ] Test all critical user flows
- [ ] Check Google Search Console
- [ ] Submit sitemap to search engines
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Set up alerts for downtime
- [ ] Document deployment process

## Configuration Examples

### Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["nrt1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/images/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/index.html",
      "destination": "/",
      "permanent": true
    }
  ]
}
```

### Next.js Production Config

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Image optimization
  images: {
    domains: [
      'your-project-id.supabase.co', // Supabase Storage
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression
  compress: true,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Experimental features (optional)
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
```

### GitHub Actions Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm test

      - name: Build project
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
        if: github.ref == 'refs/heads/main'
```

### Environment Variables Template

```bash
# .env.production (DO NOT COMMIT)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://www.sayo-kotoba.com

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Error Tracking (Optional)
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Deployment Commands

```bash
# Local build test
npm run build
npm run start

# Deploy to preview (staging)
vercel

# Deploy to production
vercel --prod

# Check deployment logs
vercel logs

# List deployments
vercel ls

# Alias deployment to custom domain
vercel alias <deployment-url> www.sayo-kotoba.com
```

## Rollback Procedure

If deployment fails or issues are found:

1. Check Vercel deployment logs
2. Identify the last working deployment
3. Promote previous deployment: `vercel promote <deployment-url>`
4. Or redeploy previous commit: `git revert <commit-hash> && git push`

## References

- REQUIREMENTS.md - Section 6.1 (Hosting)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

## Validation Checklist

- [ ] Production site is accessible at custom domain
- [ ] All pages load without errors
- [ ] Images load from Supabase Storage
- [ ] ISR revalidation works correctly
- [ ] Environment variables are set
- [ ] SSL certificate is active (HTTPS)
- [ ] Sitemap.xml is accessible
- [ ] Robots.txt is accessible
- [ ] Analytics tracking works
- [ ] Performance metrics are good (Lighthouse > 90)
- [ ] Mobile responsive design works
- [ ] SEO metadata is correct
- [ ] No console errors
- [ ] Error pages (404, 500) display correctly
