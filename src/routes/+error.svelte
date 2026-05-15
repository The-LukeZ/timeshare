<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
    import ArrowLeft from "$lib/assets/arrow-left.svelte";
</script>

<main
  class="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-16 font-mono text-stone-300"
>
  <div class="w-full max-w-sm">
    <header class="mb-14">
      <p class="mb-3 text-xs tracking-[0.5em] text-stone-500 uppercase">Timeshare</p>
      <div class="h-px bg-stone-900"></div>
    </header>

    <div class="mb-10">
      <p class="mb-6 text-xs tracking-[0.4em] text-stone-400 uppercase">{page.status}</p>
      <div class="text-3xl leading-snug font-light text-stone-300">
        {#if page.status === 404}
          Link not found.
        {:else}
          Something went wrong.
        {/if}
      </div>
      <p class="mt-5 text-sm leading-relaxed tracking-wide text-stone-400">
        {#if page.status === 404}
          This moment may have expired or the link is incorrect.
        {:else}
          {page.error?.message ?? "An unexpected error occurred."}
        {/if}
      </p>
    </div>

    <footer class="mt-4">
      <div class="mb-5 h-px bg-stone-900"></div>
      <a
        href={resolve("/")}
        class="text-xs tracking-[0.35em] text-stone-500 uppercase transition-colors duration-300 hover:text-accent/70"
      >
        <ArrowLeft />
        Share a moment
      </a>
    </footer>
  </div>
</main>
