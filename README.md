# Camp Event Platform

Ionic Angular + Supabase multi-camp event management system. Transportation planning is one module inside each camp workspace.

## Setup

### 1. Install & run

```bash
npm install
npm start
```

Open http://localhost:4200

### 2. Apply Supabase SQL

In the [Supabase SQL Editor](https://supabase.com/dashboard) for project `aegfbbfanpthowfqacyg`, run in order:

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — schema, RLS, invite RPCs  
2. [`supabase/migrations/0002_storage.sql`](supabase/migrations/0002_storage.sql) — storage buckets (or create buckets in Dashboard)  
3. [`supabase/migrations/0003_fix_camps_select.sql`](supabase/migrations/0003_fix_camps_select.sql) — camp creator can read after insert  
4. [`supabase/migrations/0004_permissions_and_roles.sql`](supabase/migrations/0004_permissions_and_roles.sql) — `can_create_camps`, role-aware invites  

**Grant camp creation** (platform allowlist) in SQL:

```sql
update public.users
set can_create_camps = true
where email = 'your@email.com';
```

Only users with that flag see **Create camp**. Everyone can **Join** via invite.

### 3. Environment

Keys live in:

- [`src/environments/environment.ts`](src/environments/environment.ts)
- [`src/environments/environment.development.ts`](src/environments/environment.development.ts)

Use the **publishable/anon** key only in the Angular app. Never put the service-role key in the client.

## Deploy (Cloudflare Pages)

1. In [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → connect the `Camp` GitHub repo.
2. Build settings:

| Setting | Value |
|---------|--------|
| Framework preset | None (or Angular) |
| Build command | `npm run build` |
| Build output directory | `dist/camp-transportation-planner/browser` |
| Root directory | `/` (repo root) |
| Node version | `22` (set env `NODE_VERSION=22`, or use [`.nvmrc`](.nvmrc)) |

**Important:** use a **Pages** project that deploys static output. Do **not** use a Worker deploy step like `npx wrangler versions upload` for this app — that path expects a Worker and newer Wrangler needs Node 22+.

If the dashboard shows a custom **Deploy command**, clear it so Pages only uploads the build output folder.
3. SPA routing is covered by [`public/_redirects`](public/_redirects) (copied into the build output).
4. After the first deploy, copy the Pages URL (e.g. `https://camp-xxx.pages.dev`) into **Supabase → Authentication → URL Configuration**:
   - **Site URL**: your Pages URL (or custom domain)
   - **Redirect URLs**: `https://your-pages-url.pages.dev/**` and `http://localhost:4200/**`

5. Optional: attach a custom domain under Pages → Custom domains.

Do **not** add `SUPABASE_SECRET_KEY` or `DATABASE_URL` as Pages env vars for this frontend — the app only needs the publishable key already in `environment.ts`.

## First-time flow

1. Register / login  
2. **My Camps** → create a camp (you become ORGANIZER)  
3. Open the camp → **Transportation**  
4. Optional: **Export → Reset to published seed** to import the bundled roster into this camp  
5. **Settings** → create invitation link `/join/:slug/:code` for participants  

## Routes

| Path | Purpose |
|------|---------|
| `/login` `/register` | Auth |
| `/dashboard` | My camps |
| `/join/:slug/:code` | Accept invitation |
| `/camp/:campId/dashboard` | Organizer stats |
| `/camp/:campId/transportation` | Kanban planner (Supabase-backed) |
| `/camp/:campId/participants` | Registrations list |
| `/camp/:campId/registration` | Own transport registration |
| `/camp/:campId/me` | Participant portal |
| `/camp/:campId/driver` | Driver portal |
| `/camp/:campId/settings` | Camp settings, invites, duplicate |

## Architecture

- **Auth / camp context / permissions** — `src/app/core/`
- **Camps, participants, dashboards** — `src/app/features/`
- **Transport** — still under `features/transport-planner`, persisted via `SupabaseTransportRepository` scoped by `CampContextService`
- **RLS** — users only see camps they belong to; organizers mutate camp data

## Scripts

```bash
npm start
npm run build
npm test
```
