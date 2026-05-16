# Timeshare

Share a moment in time with anyone, anywhere. You pick a date and time, get a link, and whoever opens it sees that moment converted to their local timezone.

## What it does

1. You enter a date and time
2. You get a shareable link
3. Anyone who opens the link sees the time in their own timezone

## Stack

- SvelteKit + Cloudflare Workers
- Cloudflare D1 (SQLite) for storing timestamps
- Tailwind CSS v4
- Paraglide for i18n

## Development

Install dependencies:

```sh
pnpm install
```

Copy `.env.example` to `.env.local` and fill in your Turnstile keys.

Start the dev server:

```sh
pnpm dev
```

Type checking:

```sh
pnpm check
```

## Deploying

```sh
npx wrangler deploy
```

Targets `timeshare.thelukez.com` via Cloudflare Workers. Make sure `DB` (D1) and `RATE_LIMITER` bindings are configured in `wrangler.jsonc` before deploying.
