# World Cup 2026 Prediction Game

A full-stack prediction game for FIFA World Cup 2026. Pick match scores, tournament props, and compete on a live leaderboard.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend:** Supabase (auth, database, edge functions, storage)
- **Hosting:** Vercel
- **Results API:** [football-data.org](https://www.football-data.org/) (free tier)

## Features

- Magic link authentication (email only, no passwords)
- Match score predictions (locked at kickoff)
- Tournament props (champion + top scorer, locked at first group match)
- Live leaderboard with realtime updates
- Profile with avatar upload and crop
- Admin panel for matches, users, invites, and tournament results
- Automated results sync via Supabase Edge Function

## Scoring

| Result | Points |
|--------|--------|
| Exact score | 3 |
| Correct outcome (win/draw/loss) | 1 |
| Wrong outcome | 0 |
| Champion correct (props) | 5 |
| Top scorer correct (props) | 3 |

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the migration file: [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)
3. Enable **Email** auth provider (Authentication → Providers → Email)
4. Set **Site URL** and **Redirect URLs** under Authentication → URL Configuration:
   - `http://localhost:3000/auth/callback`
   - `https://your-app.vercel.app/auth/callback`

### 3. Environment variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + local | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + local (server only) | Service role key for admin API |
| `FOOTBALL_DATA_API_KEY` | Supabase Edge Function only | football-data.org API token |

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Make yourself admin

After signing up, run in Supabase SQL Editor:

```sql
update profiles set is_admin = true where id = '<your-user-uuid>';
```

Find your UUID in Authentication → Users.

## Inviting Friends

### Option A: Open signup

Anyone can visit `/login`, enter their email, and receive a magic link.

### Option B: Admin invite (pre-fills display name)

1. Log in as admin and go to `/admin` → **Users** tab
2. Enter email + display name and click **Send invite**
3. The invited user receives an email with a magic link
4. On first login, their display name is pre-populated from invite metadata

## Deploy Edge Function (Results Sync)

### Deploy

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase secrets set FOOTBALL_DATA_API_KEY=your-api-key
npx supabase functions deploy sync-results
```

The edge function automatically has access to `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### Schedule cron (every 15 minutes)

Enable `pg_cron` and `pg_net` extensions in Supabase Dashboard → Database → Extensions.

Store secrets in Vault, then run:

```sql
select vault.create_secret('https://your-project.supabase.co', 'project_url');
select vault.create_secret('your-service-role-key', 'service_role_key');

select cron.schedule(
  'sync-wc-results',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sync-results',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Admins can also trigger a manual sync from `/admin` → **Sync from API**.

## Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
4. Deploy
5. Add your Vercel URL to Supabase redirect URLs

## Project Structure

```
app/
  page.tsx              # Leaderboard
  predict/page.tsx      # Predictions
  matches/page.tsx      # Fixture list
  profile/page.tsx      # User profile
  admin/page.tsx        # Admin panel
  login/page.tsx        # Magic link login
  onboarding/page.tsx   # First-time profile setup
  auth/callback/        # Auth callback handler
  api/admin/invite-user # Admin invite API
components/             # UI and domain components
lib/                    # Supabase clients, scoring, teams
supabase/
  migrations/           # Database schema + RLS
  functions/sync-results/  # Results sync edge function
```

## Notes

- football-data.org free tier may have limited World Cup 2026 data before the tournament. Use the admin panel to add/edit matches manually.
- Deactivated users (`is_active = false`) are hidden from the leaderboard and blocked from logging in.
- Predictions are enforced server-side via RLS — locked at kickoff.
