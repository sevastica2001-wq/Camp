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
