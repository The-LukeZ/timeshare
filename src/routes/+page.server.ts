import { fail, redirect } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { TURNSTILE_SECRET_KEY } from "$env/static/private";
import { supabase } from "$lib/server/supabase";

export const actions = {
  default: async ({ request, platform, getClientAddress }) => {
    const ip = getClientAddress();
    const limiter = platform?.env?.RATE_LIMITER;
    if (limiter) {
      const { success } = await limiter.limit({ key: ip });
      if (!success) return fail(429, { error: "Too many requests. Try again in a minute." });
    }

    const data = await request.formData();
    const token = data.get("cf-turnstile-response") as string;
    const ts = data.get("ts") as string;
    const creatorTimezone = data.get("creator_timezone") as string;

    if (!dev) {
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
      });
      const verification = (await verifyRes.json()) as { success: boolean };
      if (!verification.success) return fail(400, { error: "Captcha verification failed." });
    }

    if (!ts || isNaN(Date.parse(ts))) return fail(400, { error: "Invalid timestamp." });

    try {
      new Intl.DateTimeFormat(undefined, { timeZone: creatorTimezone });
    } catch {
      return fail(400, { error: "Invalid timezone." });
    }

    const { data: row, error } = await supabase
      .from("timestamps")
      .insert({ ts, creator_timezone: creatorTimezone })
      .select("id")
      .single();

    if (error || !row) return fail(500, { error: "Failed to save. Please try again." });

    redirect(303, `/${row.id}?created=1`);
  },
};
