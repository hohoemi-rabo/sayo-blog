# Ticket 38: NextAuth.js v5 + Google OAuth 認証リニューアル（Phase 3C）

> **フェーズ**: Phase 3C（最後に実装）
> **依存**: Phase 3A / 3B の完了
> **ブロック**: なし

---

## 概要

管理パネルの認証を現在のパスワード方式（`admin_auth` cookie）から Google OAuth（NextAuth.js v5）へ移行する。
許可メールアドレス方式（ホワイトリスト）で紗代さん・まさゆきさんが同時ログイン可能にする。
JWT セッションを採用し、Phase 3A・3B のコードには影響を与えない形で段階的に切り替える。

---

## 実装内容

### 1. 前提

- **Phase 3A / 3B 実装中は旧パスワード認証を維持**
- **本チケット完了と同時に旧認証は削除**（共存期間は最小限）
- 紗代さん・まさゆきさんの 2 名で同時ログイン対応（JWT 方式のため制約なし）

### 2. 依存パッケージ追加

```bash
npm install next-auth@beta @auth/core
```

NextAuth.js v5（現在 beta）を採用。

### 3. 環境変数

| 変数 | 必須 | 説明 |
|------|-----|------|
| `GOOGLE_CLIENT_ID` | 必須 | Google OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | 必須 | Google OAuth クライアントシークレット |
| `NEXTAUTH_SECRET` | 必須 | JWT 暗号化シークレット（`openssl rand -base64 32`） |
| `NEXTAUTH_URL` | 必須 | サイト URL（例: `https://www.sayo-kotoba.com`） |
| `ALLOWED_EMAILS` | 必須 | カンマ区切り（例: `mo10okamitoriz@gmail.com,masayuki@example.com`） |

旧 `ADMIN_PASSWORD` は削除。

### 4. Google Cloud Console 設定（運用手順）

実装と並行して以下を準備:

1. Google Cloud Console で新規プロジェクト（or 既存プロジェクト）
2. 「OAuth 同意画面」を設定（内部 or 外部）
3. 「認証情報」→「OAuth クライアント ID」を作成（Web アプリ）
4. 承認済みリダイレクト URI:
   - 本番: `https://www.sayo-kotoba.com/api/auth/callback/google`
   - 開発: `http://localhost:3000/api/auth/callback/google`
5. クライアント ID / シークレットを `.env.local` / Vercel に設定

※ この作業は運用作業としてチケット完了条件に含める（実装と切り分ける）。

### 5. NextAuth 設定ファイル

`src/auth.ts`（新規、プロジェクトルート近く）:

```typescript
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  callbacks: {
    async signIn({ user }) {
      const allowed = (process.env.ALLOWED_EMAILS ?? '').split(',').map(s => s.trim())
      return allowed.includes(user.email ?? '')
    },
    async jwt({ token, user }) {
      if (user) token.email = user.email
      return token
    },
    async session({ session, token }) {
      if (token.email) session.user!.email = token.email as string
      return session
    },
  },
})
```

### 6. 認証ハンドラ

`src/app/api/auth/[...nextauth]/route.ts`（新規）:

```typescript
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

### 7. ミドルウェア更新

`src/middleware.ts` を以下に変更:

```typescript
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAdmin = req.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = req.nextUrl.pathname === '/admin/login'

  if (!isAdmin) return NextResponse.next()
  if (isLoginPage) return NextResponse.next()

  if (!req.auth) {
    const loginUrl = new URL('/admin/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/instagram/:path*'],
}
```

`/api/admin/*` と `/api/instagram/*` も保護対象に含める（Phase 3A の Graph API ルート用）。

### 8. ログイン画面刷新

`src/app/(auth)/admin/login/page.tsx`:

- 旧: パスワード入力フォーム
- 新: 「Google でログイン」ボタン 1 つ
  - クリック → `signIn('google', { callbackUrl: '/admin' })`

エラー表示（未許可メール等）:
- `searchParams.error` を見て「このメールアドレスではログインできません」等を表示

### 9. Server Component での認証チェック

旧コード（cookie 読み取り）:
```typescript
const cookieStore = await cookies()
const authCookie = cookieStore.get('admin_auth')
if (!authCookie) redirect('/admin/login')
```

新コード:
```typescript
import { auth } from '@/auth'
const session = await auth()
if (!session) redirect('/admin/login')
```

### 10. API Route での認証チェック

旧パターン:
```typescript
const authCookie = cookies().get('admin_auth')
if (!authCookie) return Response.json({ error: 'Unauthorized' }, { status: 401 })
```

新パターン:
```typescript
import { auth } from '@/auth'
const session = await auth()
if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
```

### 11. Chat ページの管理者判定

`src/app/(public)/chat/page.tsx` の「管理者 vs 一般ユーザー」分岐を `auth()` 使用に変更:

```typescript
const session = await auth()
const isAdmin = !!session
```

### 12. 旧認証の削除

以下ファイル・コードを削除:
- `src/app/api/admin/login/route.ts`
- `src/app/api/admin/logout/route.ts`
- 旧ログイン画面のパスワード入力フォーム
- 旧ミドルウェアの cookie チェックロジック
- `.env.local.example` から `ADMIN_PASSWORD` を削除

### 13. Header（管理パネル）のログアウトボタン

`src/components/admin/Header.tsx`:
```typescript
import { signOut } from 'next-auth/react'
// もしくは Server Action 経由で signOut() を呼ぶ
<button onClick={() => signOut({ callbackUrl: '/admin/login' })}>ログアウト</button>
```

### 14. 型拡張

`src/types/next-auth.d.ts`（新規）:

```typescript
import 'next-auth'
declare module 'next-auth' {
  interface Session {
    user: {
      email: string
      name?: string | null
      image?: string | null
    }
  }
}
```

### 15. 移行手順（本番反映時の運用）

1. ステージング環境で Google OAuth 設定を先行検証
2. `ALLOWED_EMAILS` を正しく設定
3. 本番環境変数を Vercel に追加
4. 旧認証コード削除をデプロイ
5. 紗代さんに Google ログインを案内

### 16. ドキュメント更新

- `CLAUDE.md` の「認証」項目を更新
- `.env.local.example` から `ADMIN_PASSWORD` を削除、OAuth 変数を追加
- `SPEC-FULL.md` の「14. 認証 & セキュリティ」章を更新（Phase 3 最終チケットで実施）

---

## ファイル構成

```
src/
├── auth.ts                                  # 新規 - NextAuth 設定
├── middleware.ts                            # 編集 - auth() ベースに
├── types/next-auth.d.ts                     # 新規 - Session 型拡張
└── app/
    ├── api/auth/[...nextauth]/route.ts      # 新規
    ├── api/admin/login/route.ts             # 削除
    ├── api/admin/logout/route.ts            # 削除
    └── (auth)/admin/login/page.tsx          # 編集 - Google ログインボタン
```

---

## 完了条件

- [ ] `next-auth@beta` が package.json に追加されている
- [ ] `.env.local.example` に GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / NEXTAUTH_SECRET / NEXTAUTH_URL / ALLOWED_EMAILS が追加されている
- [ ] `.env.local.example` から ADMIN_PASSWORD が削除されている
- [ ] Google Cloud Console で OAuth クライアントが作成されリダイレクト URI が設定済み
- [ ] `src/auth.ts` で NextAuth が設定されている（JWT + signIn callback でホワイトリスト）
- [ ] `/api/auth/[...nextauth]` ルートが作成されている
- [ ] `src/middleware.ts` が `auth()` ベースに書き換えられている
- [ ] ミドルウェアが `/admin/*`, `/api/admin/*`, `/api/instagram/*` を保護している
- [ ] 未認証時に `/admin/login?callbackUrl=...` にリダイレクトされる
- [ ] ログイン画面が「Google でログイン」ボタン 1 つになっている
- [ ] 未許可メールでのログイン時にエラーメッセージが表示される
- [ ] 全管理画面 Server Component の認証チェックが `auth()` に統一されている
- [ ] 全 API Route の認証チェックが `auth()` に統一されている
- [ ] Chat ページの管理者判定が `auth()` ベースになっている
- [ ] Header のログアウトボタンが `signOut()` を呼ぶ
- [ ] 旧 `/api/admin/login` / `/api/admin/logout` ルートが削除されている
- [ ] 旧 `admin_auth` cookie 関連コードが削除されている
- [ ] 紗代さんとまさゆきさんが別ブラウザで同時ログイン可能
- [ ] `npm run build` が成功する
