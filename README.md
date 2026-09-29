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
2. SQL Editor → New query → paste all of `supabase/setup.sql` → Run (one paste creates every table, rule and the file bucket).
3. Authentication → URL Configuration
   - Site URL: `https://navigator.xplorevietnam.org`
   - Redirect URLs: `https://navigator.xplorevietnam.org/auth/callback`, `http://localhost:3000/auth/callback`
4. Authentication → Emails → "Confirm signup": subject `Confirm your email - your Vietnam planning portal is ready`,
   body = `supabase/email/confirm-signup.html`.
5. Authentication → Emails → SMTP: use your own sender (e.g. info@xplorevietnam.org). Supabase's built-in sender
   is rate-limited and only for testing.
6. Project Settings → API: copy the Project URL and publishable (or anon) key into Vercel env vars
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Later schema changes arrive as new files in `supabase/migrations/`; run only the new file (setup.sql already includes them all, for a fresh project).

## Turn on payments (Stripe)

Without these keys, "Get Started" records a request and the team follows up by email.

1. Stripe Dashboard → (optional, recommended) create a separate account named XploreVietnam under your login, so
   checkout says "Pay XploreVietnam" and payouts stay separate from BourdonLabs.
2. Developers → API keys → copy the **Secret key** (`sk_live_…`) into Vercel as `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → Add endpoint `https://navigator.xplorevietnam.org/api/stripe/webhook`,
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

## Admin area (/admin)

Staff-only dashboard: overview (sign-ups, onboarding, requests, revenue, breakdowns), clients list (search, filters, CSV
export), client page (move profile, visa documents, service requests, progress, cost-of-living budget, pipeline stage,
owner, internal notes), requests queue, and team.

1. Run `supabase/migrations/0005_admin.sql` once (SQL Editor). `setup.sql` already includes it for fresh projects.
2. Make someone staff (they must have signed up first):
   ```sql
   insert into public.staff (user_id, full_name, title, email)
   select id, 'Full Name', 'Job title', email from auth.users where email = 'their-email@example.com';
   ```
3. They open `/admin`, or Admin in the avatar menu. Non-staff accounts see a "Staff only" page, and the database
   refuses their queries anyway (row level security), so hiding the page is not what protects the data.

## Website (xplorevietnam.org)

The public website lives in `website/` and is its own Vercel project (root directory `website`, build `python3 build.py`,
output `dist`). `python3 website/build.py` also prints a PRE-LAUNCH list of anything still unfinished.

- **Prices:** `website/src/data/catalog.json` is the only place prices live. The website renders them and the checkout
  charges them. `price: null` = "Price on request" (the cart sends a quote request instead of charging).
- **Forms** (contact, free-call request, newsletter, city quiz, order requests) post to `/api/leads` here and land in
  Admin → Website leads. Run `supabase/migrations/0006_website.sql` once.
- **Cart checkout** posts to `/api/shop/checkout`, which creates a Stripe Checkout session. The Stripe webhook records
  paid orders in Admin → Website orders. It needs the same Stripe setup as Navigator payments (above) plus
  `SUPABASE_SERVICE_ROLE_KEY`. Without a Stripe key the cart sends an order request instead of charging.
