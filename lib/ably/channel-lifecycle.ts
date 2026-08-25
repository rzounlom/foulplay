import type * as Ably from "ably";

/** Expected Ably errors during React Strict Mode mount/unmount cycles. */
export function isBenignAblyStateError(err: unknown): boolean {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: string }).message)
      : String(err ?? "");
  const code =
    err && typeof err === "object" && "code" in err
      ? Number((err as { code?: number }).code)
      : NaN;
  return (
    msg.includes("state = detached") ||
    msg.includes("state = detaching") ||
    msg.includes("state = failed") ||
    msg.includes("Unable to attach") ||
    msg.includes("Connection closed") ||
    msg.includes("Connection failed") ||
    msg.includes("Connection unavailable") ||
    code === 80017 // connection closed (Ably)
  );
}

function swallowAblyReleaseError(err: unknown): void {
  if (process.env.NODE_ENV === "development" && !isBenignAblyStateError(err)) {
    console.warn("[Ably] release error:", err);
  }
}

/**
 * Subscribe auto-attaches channels in Ably; explicit attach() is usually redundant
 * and races with React Strict Mode cleanup. Kept for callers that need it.
 */
export function safeAttachChannel(channel: Ably.RealtimeChannel): void {
  const state = channel.state;
  if (state === "attached" || state === "attaching") return;
  if (state !== "detached" && state !== "failed") return;
  void channel.attach().catch(swallowAblyReleaseError);
}

/** Close on the next tick so in-flight subscribe/attach can settle; swallow close races. */
export function safeCloseClient(client: Ably.Realtime): void {
  queueMicrotask(() => {
    try {
      const state = client.connection.state;
      if (state === "closed" || state === "failed" || state === "closing") {
        return;
      }
      const result = client.close() as unknown;
      if (
        result &&
        typeof result === "object" &&
        "catch" in result &&
        typeof (result as Promise<void>).catch === "function"
      ) {
        void (result as Promise<void>).catch(swallowAblyReleaseError);
      }
    } catch (err) {
      swallowAblyReleaseError(err);
    }
  });
}

/** Unsubscribe and close client (subscribe() handles attach; do not detach explicitly). */
export function releaseAblySubscription(
  channel: Ably.RealtimeChannel,
  client: Ably.Realtime,
): void {
  try {
    channel.unsubscribe();
  } catch {
    /* ignore */
  }
  safeCloseClient(client);
}
