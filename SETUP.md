# Chocolatehouse Founder Platform — setup

This is a real TanStack Start app wired to Supabase auth and a real
database, scaffolded from the official `npm create @tanstack/start` CLI.
Login, Dashboard, Pre-launch, Roadmap, and Notes are all live and querying
Supabase directly. Expenses, Documents, Chat, and Equipment from the
earlier JSX mockups still need porting the same way (see "What's real vs.
what's still a mockup" below).

## 1. Create the database tables

In your Supabase project dashboard, open the SQL Editor and run the entire
contents of `supabase/schema.sql`. This creates every table the platform
needs (founders, phases, tasks, task_logs, blockers, prelaunch_categories,
prelaunch_expenses, expenses, notes, documents, equipment, chat_messages)
plus row-level security policies, plus seeds the 5 roadmap phases and 9
pre-launch budget categories from the plan.

## 2. Add your founders

Supabase Auth needs a real user per founder before they can log in:

- In the Supabase dashboard: Authentication -> Users -> Add user (do this
  for each of your 3-4 founders, or use "invite by email" so they set
  their own password)
- Then insert a matching row in the `founders` table for each one, e.g.:

```sql
insert into founders (id, name, initial, color)
values ('<the-user-id-from-auth>', 'Rahul', 'R', '#2E6CA4');
```

(You can find each user's id in Authentication -> Users after creating them.)

## 3. Set your environment variables

```
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase
project's Settings -> API page.

## 4. Run it locally

```
npm run dev
```

Visit http://localhost:3000 — you'll be redirected to `/login` since the
home route is protected. Log in with one of the founder accounts you
created in step 2.

## 5. Deploy to Vercel

- Push this folder to a GitHub repo
- Import it in Vercel
- Add the same two environment variables (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings
- Deploy — Vercel auto-detects the Vite/Nitro build

## What's real vs. what's still a mockup

**Real and working:**
- Supabase auth (login/logout, session via cookies)
- A protected layout (`_authed.tsx`) — every screen inside it checks the
  session once, shares the founders list, and shows the sidebar
- **Dashboard** (`/`) — real completion %, real pre-launch totals, real
  open-blocker count and recent spending, all queried live
- **Pre-launch** (`/prelaunch`) — real category budgets and expense log;
  adding an expense actually inserts a row and the progress bars update
- **Roadmap** (`/roadmap`) — real phases and tasks from the database; the
  Start → Ready for verification → Confirm complete flow genuinely updates
  `tasks.status` and `tasks.verified_by`, task notes genuinely insert into
  `task_logs`, and blockers genuinely insert into `blockers`
- **Notes** (`/notes`) — real per-founder private notes; row-level security
  enforces privacy at the database level, not just in the UI

**Still needs porting from the JSX prototypes:**
- Expenses, Documents, Chat, Equipment — these still only exist as the
  standalone `founder_platform_web.jsx` / `founder_platform_mobile.jsx`
  mockups with local `useState` and hardcoded sample data. Porting each one
  follows the exact same pattern as Pre-launch/Roadmap/Notes above: a
  `createServerFn` loader for the initial read, `getSupabaseBrowserClient()`
  calls for inserts/updates, and `router.invalidate()` to refresh after a
  write. The `expenses`, `documents`, `equipment`, and `chat_messages`
  tables already exist in `supabase/schema.sql` and are ready to receive
  real data.

Recommended order to port next: Expenses (same shape as Pre-launch, so
it'll go fast), then Equipment, then Documents, then Chat last (it's the
one that would benefit most from Supabase Realtime for live updates,
which is worth setting up deliberately rather than rushing).
