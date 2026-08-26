import { prisma } from "@/lib/db/prisma";
import type { AnalyticsEventName } from "@/lib/analytics/events";
import type { Prisma } from "@prisma/client";

export type TrackEventInput = {
  name: AnalyticsEventName | string;
  userId?: string | null;
  roomId?: string | null;
  props?: Record<string, unknown>;
};

/**
 * Persist a product analytics event. Safe to call fire-and-forget from hot paths.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  const record = {
    event: input.name,
    ts: new Date().toISOString(),
    userId: input.userId ?? undefined,
    roomId: input.roomId ?? undefined,
    ...input.props,
  };
  const line = JSON.stringify(record);
  console.info("[analytics]", line);

  const webhook = process.env.ANALYTICS_WEBHOOK_URL ?? process.env.PUBLIC_CHAOS_ANALYTICS_WEBHOOK_URL;
  if (webhook) {
    void fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: line,
    }).catch(() => {});
  }

  try {
    await prisma.analyticsEvent.create({
      data: {
        name: input.name,
        userId: input.userId ?? null,
        roomId: input.roomId ?? null,
        props: (input.props ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("[analytics] failed to persist event:", input.name, error);
  }
}

export function trackEventFireAndForget(input: TrackEventInput): void {
  void trackEvent(input);
}
