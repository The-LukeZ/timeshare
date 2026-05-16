<script lang="ts">
  import { onMount, tick } from "svelte";
  import { PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public";
  import ArrowRight from "$lib/assets/arrow-right.svelte";

  import * as m from "$lib/paraglide/messages.js";
  import { resolve } from "$app/paths";

  let { form } = $props();

  let tsValue = $state("");
  let timezone = $state("");
  let mounted = $state(false);

  onMount(async () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    tsValue = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    mounted = true;
    await tick();
    (window as any).turnstile?.render('#cf-turnstile-container', {
      sitekey: PUBLIC_TURNSTILE_SITE_KEY,
      theme: 'dark',
    });
  });
</script>

<svelte:head>
  <title>Timeshare — Share a moment across timezones</title>
  <meta
    name="description"
    content="Pick a date and time, share the link. Anyone who opens it sees the moment converted to their local timezone."
  />
</svelte:head>

<main
  class="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-16 font-mono text-stone-300"
>
  <div class="w-full max-w-sm">
    <!-- Logotype -->
    <header class="mb-14">
      <h1 class="text-sm font-bold tracking-[0.45em] text-stone-500 uppercase">Timeshare</h1>
      <div class="mt-5 h-px bg-stone-900"></div>
    </header>

    <!-- Form -->
    <form method="POST" class="space-y-10">
      <div>
        <label for="ts" class="mb-3 block text-xs tracking-[0.4em] text-stone-400 uppercase"
          >{m.label_moment()}</label
        >
        <input
          id="ts"
          type="datetime-local"
          name="ts"
          bind:value={tsValue}
          required
          style="color-scheme: dark;"
          class="w-full border border-stone-800 bg-transparent px-4 py-3 text-base text-stone-300 placeholder-stone-700 transition-colors duration-300 focus:border-accent/60 focus:outline-none"
        />
        <p class="mt-2 text-xs tracking-wide text-stone-500">
          {#if mounted}
            {m.detected_timezone({ timezone })}
          {:else}
            {m.detecting_timezone()}
          {/if}
        </p>
      </div>

      <input type="hidden" name="creator_timezone" value={timezone} />

      <!-- Turnstile -->
      {#if mounted}
        <div>
          <p class="mb-3 text-xs tracking-[0.4em] text-stone-400 uppercase">{m.label_verification()}</p>
          <div id="cf-turnstile-container"></div>
        </div>
      {/if}

      <!-- Error -->
      {#if form?.error}
        <div class="border-l-2 border-error-border py-1 pl-4">
          <p class="text-sm tracking-wide text-error">{form.error}</p>
        </div>
      {/if}

      <!-- Submit -->
      <div>
        <button
          type="submit"
          class="w-full cursor-pointer border border-accent/40 py-3.5 text-sm font-normal tracking-[0.35em] text-accent uppercase transition-all duration-300 hover:border-accent hover:bg-accent hover:text-bg"
        >
          {m.btn_share()}
          <ArrowRight />
        </button>
      </div>
    </form>

    <!-- Footer rule -->
    <footer class="mt-14">
      <div class="mb-5 h-px bg-stone-900"></div>
      <div class="flex flex-col items-start justify-between gap-4">
        <p class="text-xs leading-relaxed tracking-wide text-stone-500">
          {m.footer_description()}
        </p>
        {#if mounted}
          <a
            href={resolve("/history")}
            class="shrink-0 text-xs tracking-[0.35em] text-stone-500 uppercase transition-colors duration-300 hover:text-accent/70"
          >
            {m.nav_my_moments()}
          </a>
        {/if}
      </div>
    </footer>
  </div>
</main>
