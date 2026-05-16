# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # start dev server (vite)
pnpm build            # build for Cloudflare Workers
pnpm check            # svelte-kit sync + svelte-check (type checking)
pnpm check:watch      # type checking in watch mode
pnpm lint             # prettier + eslint
pnpm format           # prettier write

# Supabase (requires local Docker)
npx supabase start    # start local Supabase stack
npx supabase stop
npx supabase db push  # apply pending migrations to local DB
pnpm db:types         # regenerate src/lib/database.types.ts from local schema

# Deploy
npx wrangler deploy   # deploy to Cloudflare Workers
```

!! Note: In WSL, don't use any of the commands above - let the user do it.

## Architecture

**Stack**: SvelteKit + Cloudflare Workers (via `adapter-auto` + wrangler) + Supabase (Postgres + RLS).

**Purpose**: Create shareable timestamp links. Creator submits a datetime → gets a UUID link. Viewer opens link → sees the time in both their timezone and the creator's timezone. Timezone conversion is purely client-side via `Intl.DateTimeFormat`.

### Data flow

1. `POST /` → `src/routes/+page.server.ts` — rate-limit (CF Rate Limiter binding), Turnstile verification, insert into `timestamps` table, redirect to `/:id?created=1`
2. `GET /:id` → `src/routes/[id]/+page.server.ts` — fetch row by UUID, pass `id` + `ts` (UTC ISO) + `creatorTimezone` to page
3. `src/routes/[id]/+page.svelte` — `onMount` detects viewer timezone, formats both times client-side. Uses `{#if mounted}` guard to avoid SSR hydration mismatch. If `?created=1` query param present, saves entry to `timeshare_history` in localStorage.
4. `GET /history` → `src/routes/history/+page.svelte` — client-only page, reads `timeshare_history` from localStorage, lists all moments the user created with links back to `/:id`.

### localStorage

Key: `timeshare_history`. Value: JSON array (newest first) of `{ id, ts, creatorTimezone, savedAt }`. Only populated when the user creates a moment (via `?created=1` flag on redirect). Visiting a shared link directly never writes to localStorage.

### Supabase clients — two exist, don't confuse them

- `src/lib/server/supabase.ts` — uses `SUPABASE_SECRET_KEY` (service role). **Server-side only.** Bypasses RLS. Used in `+page.server.ts` files for inserts and reads.
- `src/lib/supabase.ts` — uses `PUBLIC_SUPABASE_PUBLIC_KEY` (anon key). For future client-side use if needed.

### Cloudflare bindings

- `RATE_LIMITER` — CF Rate Limiter. Guarded with `platform?.env?.RATE_LIMITER` because it's absent in `vite dev`. Namespace ID in `wrangler.jsonc`; replace placeholder with real ID from CF dashboard for prod.
- Wrangler config: `wrangler.jsonc`. Targets `timeshare.thelukez.com` as a custom domain.

### Styling

Tailwind CSS v4 — no `tailwind.config.*` file. Loaded via `@tailwindcss/vite` plugin. All config (theme, etc.) goes in CSS using `@theme` blocks if needed.

Colors live in `src/routes/layout.css` as `:root` CSS variables exposed via `@theme inline`:

- `bg-bg` — page background (`#080808`)
- `text-accent` / `bg-accent` / `border-accent` — amber (`#f59e0b`)
- `text-error` / `border-error-border` — error states
- All other text/surface colors use Tailwind's built-in `stone` scale (`stone-300` primary, `stone-400` secondary/labels, `stone-500` muted, `stone-900` borders/lines).

### i18n

Paraglide (`@inlang/paraglide-js`) handles i18n. `src/hooks.server.ts` wraps requests with `paraglideMiddleware`. `src/hooks.ts` exports `reroute` to strip locale prefixes. Message files live in `messages/`. Generated runtime at `src/lib/paraglide/` (gitignored, rebuilt by vite plugin).

- Base locale: `en`. Supported: `en`, `de`, `fr`, `es`.
- Add/edit strings in `messages/en.json` first, then mirror keys in `de.json`, `fr.json`, `es.json`.
- Use messages in components: `import * as m from "$lib/paraglide/messages.js"` then call `m.key_name()`. Keys with params: `m.key({ param: value })`.
- Never import from `src/lib/paraglide/` directly except via the `messages.js` barrel — the runtime files are generated and will be overwritten.

### Env vars

| Variable                     | Used in                               |
| ---------------------------- | ------------------------------------- |
| `SUPABASE_URL`               | server supabase client                |
| `SUPABASE_SECRET_KEY`        | server supabase client (service role) |
| `PUBLIC_SUPABASE_URL`        | client supabase client                |
| `PUBLIC_SUPABASE_PUBLIC_KEY` | client supabase client (anon)         |
| `TURNSTILE_SECRET_KEY`       | server action (Turnstile verify)      |
| `PUBLIC_TURNSTILE_SITE_KEY`  | +page.svelte (widget sitekey)         |

Dev values (test keys) live in `.env.local` (gitignored).

### Migrations

Numbered with timestamp prefix in `supabase/migrations/`. After adding a migration: `npx supabase db push` then `pnpm db:types` to regenerate TypeScript types. The `database.types.ts` must be kept in sync — it's the source of truth for typed Supabase queries.
