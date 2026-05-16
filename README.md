# Timeshare

Share a moment in time with anyone, anywhere. You pick a date and time, get a link, and whoever opens it sees that moment converted to their local timezone.

## What it does

1. You enter a date and time
2. You get a shareable link
3. Anyone who opens the link sees the time in their own timezone

## Stack

- SvelteKit + Cloudflare Workers
- Supabase (Postgres) for storing timestamps
- Tailwind CSS v4
- Paraglide for i18n (English, German, French, Spanish)

## Development

Install dependencies:

```sh
pnpm install
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase and Turnstile keys.

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

Targets `timeshare.thelukez.com` via Cloudflare Workers. Make sure your Cloudflare bindings (Rate Limiter) are configured in `wrangler.jsonc` before deploying.
