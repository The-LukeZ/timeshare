create extension if not exists "pgcrypto";

create table
  timestamps (
    id uuid primary key default gen_random_uuid (),
    ts timestamptz not null,
    created_at timestamptz not null default now ()
  );

-- No auth needed, but restrict writes via RLS:
alter table timestamps enable row level security;

-- Anyone can read (needed for the share link):
create policy "public read" on timestamps for
select
  using (true);

-- Inserts go through the service role only (server-side):