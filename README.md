# PathShift — Career Transition Assessment App

**Tagline:** Find your next career in 5 minutes.

PathShift is a mobile-first career transition assessment web app built with React, Vite, TypeScript, Tailwind CSS, Supabase (Postgres + Deno Edge Functions), OpenRouter (free-tier models with fallback), Google Sheets backup via Google Apps Script, and WhatsApp coaching handoff.

---

## Quick Setup Guide

### 1. Create a Supabase Project & Run Migrations
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in your Supabase dashboard and run `/supabase/migrations/001_initial_schema.sql`.
3. Create your admin user in **Authentication → Users → Add user** (email + password).
4. Copy that user's UUID and grant admin access in SQL Editor:
   ```sql
   insert into public.admin_users (user_id) values ('YOUR_ADMIN_USER_UUID');
   ```

### 2. Configure OpenRouter
1. Create an API key at [openrouter.ai](https://openrouter.ai).
2. Browse [openrouter.ai/models](https://openrouter.ai/models) filtered by **Free** and pick 2–3 current `:free` model slugs (e.g. Meta Llama, NVIDIA Nemotron) for `OPENROUTER_FALLBACKS`.
3. Default `OPENROUTER_MODEL` is `openrouter/free`. Adding ~$10 of OpenRouter credit later raises daily rate limits when traffic grows.

### 3. Deploy the Google Sheets Backup Webhook
1. Create a Google Sheet with a tab named **`Leads`**.
2. Go to **Extensions → Apps Script** and paste `/google-apps-script/Code.gs`.
3. Go to **Project Settings → Script Properties** and add:
   - `SHEETS_WEBHOOK_SECRET` = a strong random string
4. Click **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the resulting Web App URL for `SHEETS_WEBHOOK_URL`.

### 4. Set Supabase Edge Function Secrets & Deploy Functions
Using the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF

supabase secrets set \
  OPENROUTER_API_KEY="your_openrouter_key" \
  OPENROUTER_MODEL="openrouter/free" \
  OPENROUTER_FALLBACKS="meta-llama/llama-3.3-70b-instruct:free,nvidia/nemotron-3-nano-30b-a3b:free" \
  SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/.../exec" \
  SHEETS_WEBHOOK_SECRET="your_shared_secret"

supabase functions deploy sync-sheet --no-verify-jwt
supabase functions deploy log-event --no-verify-jwt
supabase functions deploy career-coach --no-verify-jwt
```

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase in deployed Edge Functions.

### 5. Set Frontend Environment Variables & Run
Copy `.env.example` to `.env` and fill in the `VITE_*` values:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WHATSAPP_NUMBER` (international format, digits only, no `+` or spaces, e.g. `2348012345678`)
- `VITE_PRICE_USD` (`150`)
- `VITE_ANCHOR_PRICE_USD` (optional — only set if you genuinely offer that regular price)

Run locally or build for production:
```bash
npm install
npm run dev
npm run build
```

### Routes
- `/` — Landing page
- `/assess` — One-question-per-screen assessment wizard
- `/results` — 3 AI-recommended career paths, 1–5 ratings, and max-2-round refinement loop
- `/offer` — $150 3-month coaching offer with WhatsApp handoff
- `/admin/login` — Supabase Auth admin sign-in
- `/admin` — Leads dashboard with filters, detail drawer, status updates, and CSV export
