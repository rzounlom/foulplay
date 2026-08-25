/**
 * Structured public chaos analytics — logs + optional webhook for future monetization / dashboards.
 */

export type PublicChaosEventName =
  | "public_room_created"
  | "public_room_joined"
  | "public_room_game_started"
  | "public_room_run_it_back"
  | "public_room_abandoned";

export type PublicChaosJoinSource = "drop_in" | "invite_link";

/** Single JSON line per event; extend payloads in callers as product needs grow. */
export function emitPublicChaosEvent(
  name: PublicChaosEventName,
  payload: Record<string, unknown>,
): void {
  const record = {
    event: name,
    ts: new Date().toISOString(),
    ...payload,
  };
  const line = JSON.stringify(record);
  console.info("[public_chaos_analytics]", line);

  const url = process.env.PUBLIC_CHAOS_ANALYTICS_WEBHOOK_URL;
  if (url) {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: line,
    }).catch(() => {});
  }
}
