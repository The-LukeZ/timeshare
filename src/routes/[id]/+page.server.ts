import { error } from "@sveltejs/kit";
import { supabase } from "$lib/server/supabase";

export async function load({ params }) {
  const { data, error: err } = await supabase
    .from("timestamps")
    .select("ts, creator_timezone")
    .eq("id", params.id)
    .single();

  if (err || !data) error(404, "Timestamp not found");

  return {
    id: params.id,
    ts: data.ts,
    creatorTimezone: data.creator_timezone,
  };
}
