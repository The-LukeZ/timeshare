# Timeshare — Claude Code Build Plan

## Context

SvelteKit + Cloudflare Workers + Supabase.  
Project scaffold and initial migration already done.  
Goal: shareable timestamp links that show the time in both the creator's and viewer's timezone.

---

## Step 1 — New migration: add `creator_timezone`

Create `supabase/migrations/0002_add_creator_timezone.sql`:

```sql
alter table timestamps
  add column creator_timezone text not null default 'UTC';
```

Run: `npx supabase db push`

Then regenerate types:

```bash
npx supabase gen types typescript --local > src/lib/database.types.ts
```

---

## Step 2 — Cloudflare type declarations

Install workers types:

```bash
npm install -D @cloudflare/workers-types
```

Update `src/app.d.ts` to declare the platform and Rate Limiter binding:

```ts
// src/app.d.ts
import type { RateLimit } from "@cloudflare/workers-types";

declare global {
  namespace App {
    interface Platform {
      env: {
        RATE_LIMITER: RateLimit;
      };
      ctx: ExecutionContext;
      cf: CfProperties;
    }
  }
}

export {};
```

---

## Step 3 — Supabase server client

Create `src/lib/server/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from "$env/static/private";
import type { Database } from "$lib/database.types";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);
```

Create `.env` (gitignored) with:

```
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=<local service key from `supabase status`>
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA  # test key for dev
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA            # test key for dev
```

---

## Step 4 — Wrangler config

Update `wrangler.jsonc` to add the Rate Limiter binding and compatibility flags:

```jsonc
{
  "name": "timeshare",
  "main": ".svelte-kit/cloudflare/_worker.js",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS",
    "directory": ".svelte-kit/cloudflare",
  },
  "rate_limits": [
    {
      "binding": "RATE_LIMITER",
      "namespace_id": "1001", // placeholder for local dev; replace with real ID from CF dashboard for prod
    },
  ],
}
```

Note: for local `vite dev`, the rate limiter binding won't exist — guard it with `platform?.env?.RATE_LIMITER`.

---

## Step 5 — Create page (`/`)

### `src/routes/+page.server.ts`

Actions:

1. Check rate limit via `platform.env.RATE_LIMITER` (5 creates/minute per IP). Return `fail(429)` if exceeded.
2. Validate Turnstile token against `https://challenges.cloudflare.com/turnstile/v0/siteverify` using `TURNSTILE_SECRET_KEY`. Return `fail(400)` if invalid.
3. Validate that `ts` is a valid ISO datetime string and `creator_timezone` is a valid IANA timezone string (use `Intl.supportedValuesOf('timeZone')` or a simple try/catch with `new Intl.DateTimeFormat(undefined, { timeZone })`).
4. Insert into `timestamps` table via Supabase service client.
5. `redirect(303, `/${row.id}`)`.

```ts
import { fail, redirect } from "@sveltejs/kit";
import { TURNSTILE_SECRET_KEY } from "$env/static/private";
import { supabase } from "$lib/server/supabase";
import type { Actions } from "./$types";

export const actions: Actions = {
  default: async ({ request, platform, getClientAddress }) => {
    // 1. Rate limit
    const ip = getClientAddress();
    const limiter = platform?.env?.RATE_LIMITER;
    if (limiter) {
      const { success } = await limiter.limit({ key: ip });
      if (!success) return fail(429, { error: "Too many requests" });
    }

    const data = await request.formData();
    const token = data.get("cf-turnstile-response") as string;
    const ts = data.get("ts") as string;
    const creatorTimezone = data.get("creator_timezone") as string;

    // 2. Verify Turnstile
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
    }).then((r) => r.json<{ success: boolean }>());

    if (!verification.success) return fail(400, { error: "Invalid captcha" });

    // 3. Validate inputs
    if (!ts || isNaN(Date.parse(ts))) return fail(400, { error: "Invalid timestamp" });

    try {
      new Intl.DateTimeFormat(undefined, { timeZone: creatorTimezone });
    } catch {
      return fail(400, { error: "Invalid timezone" });
    }

    // 4. Insert
    const { data: row, error } = await supabase
      .from("timestamps")
      .insert({ ts, creator_timezone: creatorTimezone })
      .select("id")
      .single();

    if (error || !row) return fail(500, { error: "Failed to save" });

    // 5. Redirect
    redirect(303, `/${row.id}`);
  },
};
```

### `src/routes/+page.svelte`

- A single datetime-local input (auto-fills to current time on mount)
- A hidden `creator_timezone` input populated via `Intl.DateTimeFormat().resolvedOptions().timeZone` on mount
- Cloudflare Turnstile widget (load `https://challenges.cloudflare.com/turnstile/v0/api.js` via `<svelte:head>`)
- Submit button
- Error display if form returns a failure

Design direction: **refined, typographic minimalism** — dark background, monospaced font for the time display, single accent color, generous whitespace. Think a Bloomberg terminal crossed with a museum label.

---

## Step 6 — View page (`/[id]`)

### `src/routes/[id]/+page.server.ts`

Load function: fetch the row by `params.id` from Supabase. Return `error(404)` if not found.

```ts
import { error } from "@sveltejs/kit";
import { supabase } from "$lib/server/supabase";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const { data, error: err } = await supabase
    .from("timestamps")
    .select("ts, creator_timezone")
    .eq("id", params.id)
    .single();

  if (err || !data) error(404, "Timestamp not found");

  return {
    ts: data.ts, // ISO string (UTC)
    creatorTimezone: data.creator_timezone,
  };
};
```

### `src/routes/[id]/+page.svelte`

Receives `ts` (UTC ISO string) and `creatorTimezone` from the server.

On mount (client-side only, inside `onMount`):

- Detect viewer timezone: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Format the time in viewer's timezone using `Intl.DateTimeFormat`
- Format the time in creator's timezone using `Intl.DateTimeFormat` with `timeZone: creatorTimezone`
- Display both, clearly labelled

Display structure:

```
[large] 3:00 PM          ← viewer's local time
        Tuesday, May 20 2025 · Europe/Berlin

[small] 9:00 PM Berlin time  ← creator's timezone
```

Use `{#if mounted}` pattern to avoid SSR/hydration mismatch — render a skeleton or nothing until `onMount` fires.

---

## Step 7 — Turnstile site key as public env var

Add to `.env`:

```
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

In `+page.svelte`, import from `$env/static/public`:

```ts
import { PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public";
```

Pass it to the Turnstile widget's `data-sitekey` attribute.

---

## Step 8 — Error page

Create `src/routes/+error.svelte` — minimal page handling 404 ("Link not found") and 500 states. Keep it consistent with the main design.

---

## File checklist

```
src/
  app.d.ts                          ← update with Platform types
  lib/
    server/
      supabase.ts                   ← create
    database.types.ts               ← regenerate after migration
  routes/
    +page.svelte                    ← create form
    +page.server.ts                 ← form action
    [id]/
      +page.svelte                  ← viewer
      +page.server.ts               ← load
    +error.svelte                   ← create
supabase/
  migrations/
    0002_add_creator_timezone.sql   ← create & push
.env                                ← create (gitignored)
wrangler.jsonc                      ← update
```

---

## Notes for Claude Code

- Do **not** store the viewer's timezone anywhere — detect and use it purely client-side.
- The `ts` column is `timestamptz` — Supabase returns it as a UTC ISO string. Always pass it raw to `Intl.DateTimeFormat`; never manipulate it manually.
- `getClientAddress()` in SvelteKit on Cloudflare Workers returns the real client IP via the `CF-Connecting-IP` header automatically.
- For local dev without the Rate Limiter binding, the guard `platform?.env?.RATE_LIMITER` ensures the app still works — don't error if it's absent.
- Turnstile test keys (above) always pass verification in dev so you don't need a real account locally.
