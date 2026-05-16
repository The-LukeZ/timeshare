import { error } from "@sveltejs/kit";

export async function load({ params, platform }) {
  const row = await platform!.env.DB.prepare("SELECT ts, creator_timezone FROM timestamps WHERE id = ?")
    .bind(params.id)
    .first<{ ts: string; creator_timezone: string }>();

  if (!row) error(404, "Timestamp not found");

  return {
    id: params.id,
    ts: row.ts,
    creatorTimezone: row.creator_timezone,
  };
}
