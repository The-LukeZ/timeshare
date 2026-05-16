<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import * as m from "$lib/paraglide/messages.js";
  import ArrowLeft from "$lib/assets/arrow-left.svelte";

  let { data } = $props();

  let mounted = $state(false);

  const pageTitle = (() => {
    const d = new Date(data.ts);
    const label = new Intl.DateTimeFormat(undefined, {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
    return `${label} · Timeshare`;
  })();
  let viewerTime = $state("");
  let viewerDate = $state("");
  let viewerTimezone = $state("");
  let creatorTime = $state("");
  let sameZone = $state(false);

  onMount(() => {
    const date = new Date(data.ts);
    viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    sameZone = viewerTimezone === data.creatorTimezone;

    if (page.url.searchParams.get("created") === "1") {
      const key = "timeshare_history";
      const existing: Array<{ id: string; ts: string; creatorTimezone: string; savedAt: string }> =
        JSON.parse(localStorage.getItem(key) ?? "[]");
      const entry = {
        id: data.id,
        ts: data.ts,
        creatorTimezone: data.creatorTimezone,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify([entry, ...existing.filter((e) => e.id !== entry.id)]));
    }

    viewerTime = new Intl.DateTimeFormat(undefined, {
      timeZone: viewerTimezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(date);

    viewerDate = new Intl.DateTimeFormat(undefined, {
      timeZone: viewerTimezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);

    creatorTime = new Intl.DateTimeFormat(undefined, {
      timeZone: data.creatorTimezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(date);

    mounted = true;
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta
    name="description"
    content="See this moment converted to your local timezone. Shared via Timeshare."
  />
</svelte:head>

<main
  class="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-16 font-mono text-stone-300"
>
  <div class="w-full max-w-sm">
    <!-- Header -->
    <header class="mb-14">
      <p class="mb-3 text-xs tracking-[0.5em] text-stone-500 uppercase">Timeshare</p>
      <div class="h-px bg-stone-900"></div>
    </header>

    {#if mounted}
      <!-- Viewer block -->
      <div class="mb-10">
        <p class="mb-6 text-xs tracking-[0.4em] text-stone-400 uppercase">{m.label_your_local_time()}</p>

        <div
          class="text-[clamp(4rem,16vw,6.5rem)] leading-none font-light tracking-tight text-accent tabular-nums"
        >
          {viewerTime}
        </div>

        <div class="mt-5 text-sm leading-relaxed tracking-wide text-stone-400">
          {viewerDate}<br />
          <span class="text-stone-500">{viewerTimezone}</span>
        </div>
      </div>

      <!-- Separator -->
      <div class="my-10 flex items-center gap-3 select-none">
        <div class="h-px flex-1 bg-stone-900"></div>
        <span class="text-xs text-stone-700">◆</span>
        <div class="h-px flex-1 bg-stone-900"></div>
      </div>

      <!-- Creator block -->
      {#if !sameZone}
        <div class="mb-10">
          <p class="mb-5 text-xs tracking-[0.4em] text-stone-400 uppercase">
            {m.label_originally_shared_as()}
          </p>
          <div class="text-3xl font-light tracking-tight text-stone-400 tabular-nums">
            {creatorTime}
          </div>
          <p class="mt-3 text-xs tracking-wide text-stone-500">{data.creatorTimezone}</p>
        </div>
      {:else}
        <div class="mb-10">
          <p class="mb-3 text-xs tracking-[0.4em] text-stone-400 uppercase">{m.label_origin()}</p>
          <p class="text-sm tracking-wide text-stone-400">
            {m.label_same_timezone({ timezone: data.creatorTimezone })}
          </p>
        </div>
      {/if}
    {:else}
      <!-- Skeleton -->
      <div class="mb-10">
        <p class="mb-6 text-xs tracking-[0.4em] text-stone-800 uppercase">{m.label_your_local_time()}</p>
        <div
          class="text-[5rem] leading-none font-light tracking-tight text-stone-900 tabular-nums select-none"
        >
          ——:——
        </div>
        <div class="mt-5 text-sm text-stone-800">{m.resolving()}</div>
      </div>

      <div class="my-10 flex items-center gap-3">
        <div class="h-px flex-1 bg-stone-900"></div>
        <span class="text-xs text-stone-900">◆</span>
        <div class="h-px flex-1 bg-stone-900"></div>
      </div>

      <div class="mb-10">
        <p class="mb-5 text-xs tracking-[0.4em] text-stone-800 uppercase">{m.label_originally_shared_as()}</p>
        <div class="text-3xl font-light text-stone-800">——:——</div>
      </div>
    {/if}

    <!-- Footer -->
    <footer class="mt-4">
      <div class="mb-5 h-px bg-stone-900"></div>
      <div class="flex flex-col items-center justify-between gap-4">
        <a
          href={resolve("/")}
          class="text-xs tracking-[0.35em] text-stone-500 uppercase transition-colors duration-300 hover:text-accent/70"
        >
          <ArrowLeft />
          {m.link_share_another()}
        </a>
        <a
          href={resolve("/history")}
          class="text-xs tracking-[0.35em] text-stone-500 uppercase transition-colors duration-300 hover:text-accent/70"
        >
          {m.nav_my_moments()}
        </a>
      </div>
    </footer>
  </div>
</main>
