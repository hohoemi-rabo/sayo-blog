# 13: Testing & Validation

## Overview

Implement comprehensive testing strategy including unit tests, integration tests, E2E tests, and manual validation checklists. Ensure code quality and functionality before deployment.

## Related Files

- `__tests__/` - Test files directory
- `jest.config.js` - Jest configuration
- `playwright.config.ts` - Playwright E2E configuration
- `.github/workflows/test.yml` - CI/CD test workflow
- `TESTING.md` - Testing documentation

## Technical Details

### Testing Strategy

- **Unit Tests**: Individual functions and utilities (Jest + React Testing Library)
- **Integration Tests**: Component interactions and API routes
- **E2E Tests**: Critical user flows (Playwright)
- **Manual Tests**: Visual checks, responsive design, accessibility

### Testing Pyramid

```
      E2E Tests (Few)
         ▲
        / \
       /   \
      /     \
     /       \
    /_________\
   Integration Tests (Some)
          ▲
         / \
        /   \
       /     \
      /       \
     /_________\
    Unit Tests (Many)
```

## Todo

### Test Environment Setup

- [ ] Install testing dependencies:
  - [ ] `npm install -D jest @testing-library/react @testing-library/jest-dom`
  - [ ] `npm install -D @testing-library/user-event`
  - [ ] `npm install -D @playwright/test`
- [ ] Create `jest.config.js` configuration
- [ ] Create `jest.setup.js` for global test setup
- [ ] Create `playwright.config.ts` for E2E tests
- [ ] Add test scripts to `package.json`:
  - [ ] `"test": "jest"`
  - [ ] `"test:watch": "jest --watch"`
  - [ ] `"test:e2e": "playwright test"`
- [ ] Set up test database (Supabase test project)
- [ ] Configure environment variables for testing

### Unit Tests

- [ ] Test utility functions:
  - [ ] `src/lib/pagination-utils.test.ts`
    - [ ] getPaginationRange()
    - [ ] getPaginationInfo()
  - [ ] `src/lib/filter-utils.test.ts`
    - [ ] parseFiltersFromURL()
    - [ ] buildFilterQuery()
  - [ ] `src/lib/hashtag-utils.test.ts`
    - [ ] calculateFontSize()
    - [ ] formatHashtagCount()
  - [ ] `src/lib/seo-utils.test.ts`
    - [ ] truncateDescription()
    - [ ] generateCanonicalUrl()

### Component Tests

- [ ] Test UI components:
  - [ ] `src/components/PostCard.test.tsx`
    - [ ] Renders title, excerpt, thumbnail
    - [ ] Displays category badges
    - [ ] Shows hashtags (max 3)
    - [ ] Formats date correctly
  - [ ] `src/components/Pagination.test.tsx`
    - [ ] Displays correct page numbers
    - [ ] Disables Previous on first page
    - [ ] Disables Next on last page
    - [ ] Shows ellipsis correctly
  - [ ] `src/components/FilterBar.test.tsx`
    - [ ] Updates URL on filter change
    - [ ] Preserves existing params
    - [ ] Clears filters correctly
  - [ ] `src/components/SearchBar.test.tsx`
    - [ ] Shows suggestions on input
    - [ ] Clears input on X button
    - [ ] Navigates on submit

### Integration Tests

- [ ] Test API routes:
  - [ ] `src/app/api/posts/[slug]/view/route.test.ts`
    - [ ] Increments view count
    - [ ] Returns updated count
    - [ ] Handles non-existent slug
  - [ ] `src/app/api/search/suggest/route.test.ts`
    - [ ] Returns relevant suggestions
    - [ ] Limits results correctly
    - [ ] Handles empty query
- [ ] Test data fetching:
  - [ ] `src/app/page.test.tsx`
    - [ ] Fetches and displays posts
    - [ ] Applies filters correctly
    - [ ] Handles pagination
  - [ ] `src/app/[prefecture]/[slug]/page.test.tsx`
    - [ ] Fetches single post
    - [ ] Returns 404 for invalid slug
    - [ ] Increments view count

### E2E Tests (Playwright)

- [ ] Create E2E test scenarios:
  - [ ] `tests/home-page.spec.ts`
    - [ ] Homepage loads successfully
    - [ ] Displays post cards
    - [ ] Filter bar works
    - [ ] Pagination navigates correctly
  - [ ] `tests/article-page.spec.ts`
    - [ ] Article page loads
    - [ ] Content displays correctly
    - [ ] Categories and hashtags are clickable
    - [ ] Breadcrumbs navigate correctly
  - [ ] `tests/search.spec.ts`
    - [ ] Search bar shows suggestions
    - [ ] Search results page displays
    - [ ] Filters work on search results
  - [ ] `tests/mobile.spec.ts`
    - [ ] Mobile menu opens/closes
    - [ ] Responsive layout works
    - [ ] Touch interactions work

### Accessibility Tests

- [ ] Install `@axe-core/playwright`
- [ ] Create accessibility test suite
- [ ] Test key pages:
  - [ ] Home page
  - [ ] Article page
  - [ ] Search results
- [ ] Check for:
  - [ ] Keyboard navigation
  - [ ] Screen reader compatibility
  - [ ] Color contrast (WCAG AA)
  - [ ] ARIA labels
  - [ ] Focus indicators

### Performance Tests

- [ ] Lighthouse CI setup
- [ ] Performance budget configuration
- [ ] Test metrics:
  - [ ] First Contentful Paint (FCP) < 1.8s
  - [ ] Largest Contentful Paint (LCP) < 2.5s
  - [ ] Time to Interactive (TTI) < 3.8s
  - [ ] Cumulative Layout Shift (CLS) < 0.1
  - [ ] First Input Delay (FID) < 100ms

### Manual Testing Checklist

- [ ] **Responsive Design**
  - [ ] Mobile (375px)
  - [ ] Tablet (768px)
  - [ ] Desktop (1024px, 1920px)
- [ ] **Browser Compatibility**
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge
- [ ] **Core Functionality**
  - [ ] Homepage loads with posts
  - [ ] Filters work correctly
  - [ ] Search returns results
  - [ ] Article pages display
  - [ ] Pagination navigates
  - [ ] Images load correctly
- [ ] **Visual Checks**
  - [ ] Typography is readable
  - [ ] Colors match design system
  - [ ] Animations are smooth
  - [ ] No layout shifts
- [ ] **Accessibility**
  - [ ] Keyboard navigation works
  - [ ] Screen reader announces content
  - [ ] Focus indicators visible
  - [ ] Alt text on images

### CI/CD Integration

- [ ] Create `.github/workflows/test.yml`
- [ ] Run tests on:
  - [ ] Push to main
  - [ ] Pull requests
- [ ] Include:
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] E2E tests (optional)
  - [ ] Lint checks
  - [ ] Type checks
- [ ] Set up test coverage reporting
- [ ] Fail build if tests fail

## Test Examples

### Unit Test Example

```typescript
// src/lib/pagination-utils.test.ts
import { getPaginationRange, getPaginationInfo } from './pagination-utils'

describe('getPaginationRange', () => {
  it('should return all pages when total is small', () => {
    const result = getPaginationRange(1, 5, 1)
    expect(result).toEqual([1, 2, 3, 4, 5])
  })

  it('should show ellipsis when total is large', () => {
    const result = getPaginationRange(5, 20, 1)
    expect(result).toEqual([1, '...', 4, 5, 6, '...', 20])
  })

  it('should handle first page correctly', () => {
    const result = getPaginationRange(1, 20, 1)
    expect(result).toEqual([1, 2, 3, '...', 20])
  })

  it('should handle last page correctly', () => {
    const result = getPaginationRange(20, 20, 1)
    expect(result).toEqual([1, '...', 18, 19, 20])
  })
})

describe('getPaginationInfo', () => {
  it('should calculate correct metadata', () => {
    const result = getPaginationInfo(100, 3, 12)

    expect(result).toEqual({
      totalPages: 9,
      offset: 24,
      limit: 12,
      hasNextPage: true,
      hasPreviousPage: true,
      startIndex: 25,
      endIndex: 36,
    })
  })
})
```

### Component Test Example

```typescript
// src/components/PostCard.test.tsx
import { render, screen } from '@testing-library/react'
import PostCard from './PostCard'

const mockPost = {
  id: '1',
  title: 'Test Article',
  slug: 'test-article',
  excerpt: 'This is a test excerpt',
  thumbnail_url: '/test-image.jpg',
  view_count: 100,
  published_at: '2024-01-01T00:00:00Z',
  categories: [{ name: '長野県', slug: 'nagano' }],
  hashtags: [
    { name: 'テスト', slug: 'test' },
    { name: 'サンプル', slug: 'sample' },
  ],
}

describe('PostCard', () => {
  it('should render post title', () => {
    render(<PostCard post={mockPost} />)
    expect(screen.getByText('Test Article')).toBeInTheDocument()
  })

  it('should render excerpt', () => {
    render(<PostCard post={mockPost} />)
    expect(screen.getByText('This is a test excerpt')).toBeInTheDocument()
  })

  it('should display category badge', () => {
    render(<PostCard post={mockPost} />)
    expect(screen.getByText('長野県')).toBeInTheDocument()
  })

  it('should show hashtags', () => {
    render(<PostCard post={mockPost} />)
    expect(screen.getByText('#テスト')).toBeInTheDocument()
    expect(screen.getByText('#サンプル')).toBeInTheDocument()
  })

  it('should format view count', () => {
    render(<PostCard post={mockPost} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })
})
```

### E2E Test Example

```typescript
// tests/home-page.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load and display posts', async ({ page }) => {
    await page.goto('/')

    // Check if page title is correct
    await expect(page).toHaveTitle(/Sayo's Journal/)

    // Check if post cards are displayed
    const postCards = page.locator('[data-testid="post-card"]')
    await expect(postCards).toHaveCount(12) // 12 posts per page
  })

  test('should filter by prefecture', async ({ page }) => {
    await page.goto('/')

    // Click on prefecture filter
    await page.selectOption('select[name="prefecture"]', 'nagano')

    // Wait for navigation
    await page.waitForURL('/?prefecture=nagano')

    // Check if URL updated
    expect(page.url()).toContain('prefecture=nagano')
  })

  test('should navigate through pagination', async ({ page }) => {
    await page.goto('/')

    // Click on page 2
    await page.click('text=2')

    // Wait for navigation
    await page.waitForURL('/?page=2')

    // Check if URL updated
    expect(page.url()).toContain('page=2')

    // Check if page 2 button is active
    await expect(page.locator('[aria-current="page"]')).toHaveText('2')
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Check if mobile menu button is visible
    const menuButton = page.locator('[aria-label="Toggle menu"]')
    await expect(menuButton).toBeVisible()
  })
})
```

## References

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)

## Validation Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Test coverage > 70%
- [ ] No console errors in tests
- [ ] CI/CD pipeline runs successfully
- [ ] Manual testing completed
- [ ] Accessibility audit passed
- [ ] Performance budget met
- [ ] Browser compatibility verified
