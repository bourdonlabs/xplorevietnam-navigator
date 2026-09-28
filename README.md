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

7. SQL Editor → also run `supabase/migrations/0002_visa_documents.sql` (visa uploads, dependents, service requests).

## Turn on payments (Stripe)

Without these keys, "Get Started" records a request and the team follows up by email.

1. Stripe Dashboard → (optional, recommended) create a separate account named XploreVietnam under your login, so
   checkout says "Pay XploreVietnam" and payouts stay separate from BourdonLabs.
2. Developers → API keys → copy the **Secret key** (`sk_live_…`) into Vercel as `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → Add endpoint `https://navigator.xplorevietnam.com/api/stripe/webhook`,
   events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
   Copy its **Signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.
4. Supabase → Project Settings → API → copy the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY` (server only).
5. Set `NEXT_PUBLIC_STRIPE_ENABLED=1` and redeploy.

Prices live in `src/lib/services.ts`; the server recalculates every amount, the browser never sets a price.

To make a team member staff (sees and updates every client's cases), insert a row into `public.staff` with their user id.

## Structure

- `src/app/auth` — split-screen login / sign-up, check-email, password reset, email callback
- `src/app/vietnam` — portal: sidebar layout, dashboard, sections (`[section]`), profile
- `src/components/onboarding-modal.tsx` — the 8 questions
- `src/lib/journey.ts` — journey steps, date rules, visa options (copy from the website)
- `src/lib/backend.ts` — Supabase calls, with the demo-mode fallback
- `supabase/migrations` — tables and row-level security (profiles, journey, cases, documents, updates, storage)
