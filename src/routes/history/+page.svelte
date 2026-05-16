<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import * as m from "$lib/paraglide/messages.js";
  import ArrowLeft from "$lib/assets/arrow-left.svelte";

  type Entry = { id: string; ts: string; creatorTimezone: string; savedAt: string };

  const LS_KEY = "timeshare_history";

  let mounted = $state(false);
  let entries = $state<Entry[]>([]);

  function formatTs(ts: string, timezone: string): string {
    const date = new Date(ts);
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }

  function formatSavedAt(savedAt: string): string {
    const date = new Date(savedAt);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function clearHistory() {
    if (!confirm("Clear all saved moments?")) return;
    localStorage.removeItem(LS_KEY);
    entries = [];
  }

  onMount(() => {
    entries = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
    mounted = true;
  });
</script>

<main
  class="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-16 font-mono text-stone-300"
>
  <div class="w-full max-w-sm">
    <!-- Header -->
    <header class="mb-14">
      <h1 class="text-sm font-bold tracking-[0.45em] text-stone-500 uppercase">{m.history_title()}</h1>
      <div class="mt-5 h-px bg-stone-900"></div>
    </header>

    {#if mounted}
      {#if entries.length === 0}
        <p class="text-sm tracking-wide text-stone-500">{m.history_empty()}</p>
      {:else}
        <ul class="space-y-0">
          {#each entries as entry, i (entry.id)}
            <li class={i > 0 ? "mt-6 border-t border-stone-900 pt-6" : ""}>
              <a href={resolve(`/${entry.id}`)} class="group block transition-colors duration-200">
                <p
                  class="text-base tracking-wide text-stone-300 transition-colors duration-200 group-hover:text-accent"
                >
                  {formatTs(entry.ts, entry.creatorTimezone)}
                </p>
                <p class="mt-1 text-xs tracking-wide text-stone-600">
                  {entry.creatorTimezone} · {m.history_label_shared_at()}
                  {formatSavedAt(entry.savedAt)}
                </p>
              </a>
            </li>
          {/each}
        </ul>

        <div class="mt-10">
          <button
            onclick={clearHistory}
            class="cursor-pointer text-xs tracking-[0.35em] text-stone-600 uppercase transition-colors duration-300 hover:text-error"
          >
            {m.history_clear()}
          </button>
        </div>
      {/if}
    {:else}
      <!-- Skeleton -->
      <div class="space-y-6">
        {#each [1, 2, 3] as _}
          <div>
            <div class="h-4 w-3/4 rounded-sm bg-stone-900"></div>
            <div class="mt-2 h-3 w-1/2 rounded-sm bg-stone-900"></div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Footer -->
    <footer class="mt-14">
      <div class="mb-5 h-px bg-stone-900"></div>
      <a
        href={resolve("/")}
        class="text-xs tracking-[0.35em] text-stone-500 uppercase transition-colors duration-300 hover:text-accent/70"
      >
        <ArrowLeft />
        {m.link_share_another()}
      </a>
    </footer>
  </div>
</main>
