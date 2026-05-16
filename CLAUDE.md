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

# D1 database
npx wrangler d1 execute timeshare-db --local --file=migrations/0001_initial.sql  # apply schema locally
npx wrangler d1 execute timeshare-db --remote --file=migrations/0001_initial.sql # apply schema to prod
npx wrangler d1 execute timeshare-db --local --command="SELECT * FROM timestamps" # query local DB
pnpm types            # regenerate src/worker-configuration.d.ts from wrangler bindings

# Deploy
npx wrangler deploy   # deploy to Cloudflare Workers
```

!! Note: In WSL, don't use any of the commands above - let the user do it.

## Architecture

**Stack**: SvelteKit + Cloudflare Workers (via `adapter-cloudflare` + wrangler) + Cloudflare D1 (SQLite).

**Purpose**: Create shareable timestamp links. Creator submits a datetime → gets a UUID link. Viewer opens link → sees the time in both their timezone and the creator's timezone. Timezone conversion is purely client-side via `Intl.DateTimeFormat`.

### Data flow

1. `POST /` → `src/routes/+page.server.ts` — rate-limit (CF Rate Limiter binding), Turnstile verification, convert naive local datetime string + `creatorTimezone` to UTC ISO (via `naiveLocalToUTC`), insert into `timestamps` table, redirect to `/:id?created=1`
2. `GET /:id` → `src/routes/[id]/+page.server.ts` — fetch row by UUID, pass `id` + `ts` (UTC ISO) + `creatorTimezone` to page
3. `src/routes/[id]/+page.svelte` — `onMount` detects viewer timezone, formats both times client-side. Uses `{#if mounted}` guard to avoid SSR hydration mismatch. If `?created=1` query param present, saves entry to `timeshare_history` in localStorage.
4. `GET /history` → `src/routes/history/+page.svelte` — client-only page, reads `timeshare_history` from localStorage, lists all moments the user created with links back to `/:id`.

### localStorage

Key: `timeshare_history`. Value: JSON array (newest first) of `{ id, ts, creatorTimezone, savedAt }`. Only populated when the user creates a moment (via `?created=1` flag on redirect). Visiting a shared link directly never writes to localStorage.

### D1 database

No client library. Access via `platform.env.DB` (a `D1Database` binding) directly in `+page.server.ts` files. Types generated into `src/worker-configuration.d.ts` via `pnpm types`.

Schema in `migrations/0001_initial.sql`. UUIDs generated in JS via `crypto.randomUUID()`.

### Cloudflare bindings

- `DB` — D1 database. Absent in `vite dev` (use `wrangler dev` to test D1 locally). Binding + `database_id` in `wrangler.jsonc`.
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

| Variable                    | Used in                          |
| --------------------------- | -------------------------------- |
| `TURNSTILE_SECRET_KEY`      | server action (Turnstile verify) |
| `PUBLIC_TURNSTILE_SITE_KEY` | +page.svelte (widget sitekey)    |

D1 needs no env vars — accessed via the `DB` Cloudflare binding. Dev values live in `.env.local` (gitignored).

### Migrations

SQL files in `migrations/`. SQLite syntax (D1). After adding a migration apply with `wrangler d1 execute` (see Commands above). Run `pnpm types` to regenerate `src/worker-configuration.d.ts` after changing bindings.
