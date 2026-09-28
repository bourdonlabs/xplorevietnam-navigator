# XploreVietnam Navigator

Client portal for XploreVietnam: sign-up, 8-step move profile, and a dashboard with the Vietnam journey,
visa checklists and individual services. Next.js 16 + Supabase (auth, Postgres, storage) on Vercel.

Without Supabase keys the app runs in **demo mode**: the whole flow works and data stays in the browser.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase keys, or leave empty for demo mode
npm run dev                  # http://localhost:3000
```

## Connect Supabase (once)

1. Create a project at supabase.com (region: Singapore).
2. SQL Editor → paste `supabase/migrations/0001_init.sql` → Run.
3. Authentication → URL Configuration
   - Site URL: `https://navigator.xplorevietnam.com`
   - Redirect URLs: `https://navigator.xplorevietnam.com/auth/callback`, `http://localhost:3000/auth/callback`
4. Authentication → Emails → "Confirm signup": subject `Confirm your email - your Vietnam planning portal is ready`,
   body = `supabase/email/confirm-signup.html`.
5. Authentication → Emails → SMTP: use your own sender (e.g. hello@xplorevietnam.com). Supabase's built-in sender
   is rate-limited and only for testing.
6. Project Settings → API: copy the Project URL and publishable (or anon) key into Vercel env vars
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

To make a team member staff (sees and updates every client's cases), insert a row into `public.staff` with their user id.

## Structure

- `src/app/auth` — split-screen login / sign-up, check-email, password reset, email callback
- `src/app/vietnam` — portal: sidebar layout, dashboard, sections (`[section]`), profile
- `src/components/onboarding-modal.tsx` — the 8 questions
- `src/lib/journey.ts` — journey steps, date rules, visa options (copy from the website)
- `src/lib/backend.ts` — Supabase calls, with the demo-mode fallback
- `supabase/migrations` — tables and row-level security (profiles, journey, cases, documents, updates, storage)
